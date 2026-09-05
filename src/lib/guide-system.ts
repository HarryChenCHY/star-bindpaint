/**
 * guide-system.ts — 跟画引导系统
 * 管理笔触队列、引导状态、判定逻辑
 */

import { StrokeDrawData } from './stroke-engine';

export type GuideMode = 'assist' | 'real';  // 辅助模式 | 真实模式

export interface GuideState {
  /** 当前引导到第几笔 */
  currentIndex: number;
  /** 总笔触数 */
  totalStrokes: number;
  /** 当前笔触 */
  currentStroke: StrokeDrawData | null;
  /** 是否等待用户画 */
  waitingForUser: boolean;
  /** 最近的匹配分数 */
  lastScore: number;
  /** 月亮伙伴消息 */
  message: string;
  /** 月亮伙伴状态 */
  spriteState: 'idle' | 'guiding' | 'cheering' | 'thinking';
  /** 是否已完成所有笔触 */
  completed: boolean;
}

const MESSAGES_GUIDE = [
  '从黄色星点开始，沿着星迹画这一笔。',
  '先看起点，再顺着轨迹移动画笔。',
  '只关注眼前这一笔，不用急着看完整画面。',
  '沿着星迹的方向，完成当前笔触。',
];

const MESSAGES_GOOD = [
  '这一笔已经点亮，继续寻找下一颗星点。',
  '完成一笔，画面的结构又清楚了一些。',
  '轨迹已完成，下一笔会接着出现。',
  '很好，你正在建立自己的绘画节奏。',
];

const MESSAGES_TRY = [
  '可以再试一次：先对准黄色星点。',
  '试着把方向放慢一些，再沿星迹走一遍。',
  '这一笔还没有匹配，看看起点和方向。',
];

const MESSAGES_FREE = [
  '这笔颜色已经留在画布上。',
  '继续沿着自己的想法画。',
  '新的笔触已经加入作品。',
  '保持这个节奏，继续完成画面。',
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class GuideSystem {
  private strokes: StrokeDrawData[] = [];
  private currentIdx = 0;
  private mode: GuideMode = 'assist';
  private state: GuideState;
  private listeners: Array<(state: GuideState) => void> = [];

  constructor() {
    this.state = {
      currentIndex: 0,
      totalStrokes: 0,
      currentStroke: null,
      waitingForUser: false,
      lastScore: 0,
      message: '选择一张图片，开始生成星迹。',
      spriteState: 'idle',
      completed: false,
    };
  }

  getState(): GuideState {
    return { ...this.state };
  }

  setMode(mode: GuideMode) {
    this.mode = mode;
  }

  getMode(): GuideMode {
    return this.mode;
  }

  subscribe(listener: (state: GuideState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach(l => l(s));
  }

  /**
   * 加载笔触序列，准备开始引导
   */
  loadStrokes(strokes: StrokeDrawData[]) {
    this.strokes = strokes;
    this.currentIdx = 0;
    this.state = {
      currentIndex: 0,
      totalStrokes: strokes.length,
      currentStroke: strokes.length > 0 ? strokes[0] : null,
      waitingForUser: strokes.length > 0,
      lastScore: 0,
      message: strokes.length > 0 ? randomPick(MESSAGES_GUIDE) : '没有检测到可用笔触',
      spriteState: 'guiding',
      completed: false,
    };
    this.notify();
  }

  /**
   * 用户完成一笔后调用
   * @returns 是否通过（分数 > 0.3 即通过）
   */
  submitStroke(score: number): { passed: boolean; shouldReplace: boolean } {
    const passed = score > 0.3;
    this.state.lastScore = score;

    if (passed) {
      this.state.message = randomPick(MESSAGES_GOOD);
      this.state.spriteState = 'cheering';

      // 辅助模式下替换用户笔迹
      const shouldReplace = this.mode === 'assist';

      // 延迟进入下一笔（让用户看到反馈）
      this.advanceToNext();

      return { passed: true, shouldReplace };
    } else {
      this.state.message = randomPick(MESSAGES_TRY);
      this.state.spriteState = 'guiding';
      this.notify();
      return { passed: false, shouldReplace: false };
    }
  }

  /**
   * 跳过当前笔触（静默前进，不触发动画延迟）
   */
  skip() {
    this.advanceToNextImmediate();
  }

  /**
   * 同步自动续画的位置。自动播放可能被暂停或再次进入，必须把当前索引
   * 写回引导系统，否则会从旧位置重复播放。
   */
  syncProgress(index: number, notify = false) {
    const nextIndex = Math.max(0, Math.min(index, this.strokes.length));
    this.currentIdx = nextIndex;
    const completed = nextIndex >= this.strokes.length;

    this.state = {
      ...this.state,
      currentIndex: nextIndex,
      totalStrokes: this.strokes.length,
      currentStroke: completed ? null : this.strokes[nextIndex],
      waitingForUser: !completed && this.strokes.length > 0,
      completed,
      message: completed ? '所有星迹已经完成，作品已点亮。' : '月亮伙伴正在完成剩余星迹。',
      spriteState: completed ? 'cheering' : 'guiding',
    };

    if (notify) this.notify();
  }

  /**
   * 前进到下一笔（带动画延迟）
   */
  private advanceToNext() {
    setTimeout(() => this.advanceToNextImmediate(), 800);
  }

  /**
   * 立即前进到下一笔（无延迟，用于批量操作）
   */
  private advanceToNextImmediate() {
    this.currentIdx++;
    if (this.currentIdx >= this.strokes.length) {
      this.state.completed = true;
      this.state.waitingForUser = false;
      this.state.currentStroke = null;
      this.state.currentIndex = this.currentIdx;
      this.state.message = '所有星迹已经完成，作品已点亮。';
      this.state.spriteState = 'cheering';
    } else {
      this.state.currentIndex = this.currentIdx;
      this.state.currentStroke = this.strokes[this.currentIdx];
      this.state.waitingForUser = true;
      this.state.message = randomPick(MESSAGES_GUIDE);
      this.state.spriteState = 'guiding';
    }
    this.notify();
  }

  /**
   * 自由模式反馈
   */
  freeModeFeedback() {
    this.state.message = randomPick(MESSAGES_FREE);
    this.state.spriteState = 'cheering';
    this.notify();
    setTimeout(() => {
      this.state.spriteState = 'idle';
      this.notify();
    }, 2000);
  }

  /**
   * 重置
   */
  reset() {
    this.currentIdx = 0;
    if (this.strokes.length > 0) {
      this.loadStrokes(this.strokes);
    }
  }

  /**
   * 获取当前引导笔触
   */
  getCurrentStroke(): StrokeDrawData | null {
    return this.state.currentStroke;
  }

  /**
   * 获取进度百分比
   */
  getProgress(): number {
    if (this.state.totalStrokes === 0) return 0;
    return this.currentIdx / this.state.totalStrokes;
  }
}

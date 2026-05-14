/**
 * guide-system.ts — 跟画引导系统
 * 管理笔触队列、引导状态、判定逻辑
 */

import { StrokeDrawData, Vec2 } from './stroke-engine';

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
  /** 精灵消息 */
  message: string;
  /** 精灵状态 */
  spriteState: 'idle' | 'guiding' | 'cheering' | 'thinking';
  /** 是否已完成所有笔触 */
  completed: boolean;
}

const MESSAGES_GUIDE = [
  "沿着金色虚线画一笔~",
  "跟着引导线的方向画~",
  "看到发光的线了吗？跟着画~",
  "这一笔往这个方向~",
];

const MESSAGES_GOOD = [
  "画得真棒！",
  "太厉害了！",
  "完美！继续加油！",
  "好漂亮的一笔！",
  "真有天赋！",
];

const MESSAGES_TRY = [
  "再试一次，你可以的！",
  "没关系，跟着虚线再画一次~",
  "加油，往那个方向~",
];

const MESSAGES_FREE = [
  "画得很有创意！",
  "好漂亮的颜色！",
  "继续发挥想象力~",
  "你的画好有意思！",
  "真棒，继续画吧！",
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
      message: "上传一张图片开始创作吧~",
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
      message: strokes.length > 0 ? randomPick(MESSAGES_GUIDE) : "没有检测到笔触",
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
      this.state.message = "恭喜！你完成了一幅油画！";
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

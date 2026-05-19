/**
 * emotion-detector.ts — 情绪状态被动检测器
 * 通过行为信号推断儿童当前情绪状态
 */

export type EmotionLevel = 'normal' | 'mild' | 'moderate' | 'severe';

interface DetectorState {
  consecutiveFailures: number;
  consecutiveSkips: number;
  lastStrokeEndTime: number;
  recentPressures: number[];
  recentSpeeds: number[];       // 最近几笔的绘制速度（点/秒）
  pointerDownTimes: number[];   // 最近的 pointerdown 时间戳
}

export class EmotionDetector {
  private state: DetectorState;
  private onLevelChange?: (level: EmotionLevel) => void;
  private currentLevel: EmotionLevel = 'normal';

  constructor(onLevelChange?: (level: EmotionLevel) => void) {
    this.onLevelChange = onLevelChange;
    this.state = {
      consecutiveFailures: 0,
      consecutiveSkips: 0,
      lastStrokeEndTime: Date.now(),
      recentPressures: [],
      recentSpeeds: [],
      pointerDownTimes: [],
    };
  }

  /** 笔触匹配成功 */
  reportSuccess() {
    this.state.consecutiveFailures = 0;
    this.state.consecutiveSkips = 0;
    this.state.lastStrokeEndTime = Date.now();
    this.evaluate();
  }

  /** 笔触匹配失败 */
  reportFailure() {
    this.state.consecutiveFailures++;
    this.state.lastStrokeEndTime = Date.now();
    this.evaluate();
  }

  /** 用户跳过 */
  reportSkip() {
    this.state.consecutiveSkips++;
    this.state.lastStrokeEndTime = Date.now();
    this.evaluate();
  }

  /** 报告画笔压力（0-1） */
  reportPressure(pressure: number) {
    this.state.recentPressures.push(pressure);
    if (this.state.recentPressures.length > 20) {
      this.state.recentPressures.shift();
    }
  }

  /** 报告绘制速度（points per second） */
  reportSpeed(pointsPerSecond: number) {
    this.state.recentSpeeds.push(pointsPerSecond);
    if (this.state.recentSpeeds.length > 10) {
      this.state.recentSpeeds.shift();
    }
    this.evaluate();
  }

  /** 报告 pointerdown 事件（用于检测拍打行为） */
  reportPointerDown() {
    const now = Date.now();
    this.state.pointerDownTimes.push(now);
    // 只保留最近 2 秒内的
    this.state.pointerDownTimes = this.state.pointerDownTimes.filter(t => now - t < 2000);
    this.evaluate();
  }

  /** 检查是否长时间未操作 */
  checkIdle(): EmotionLevel {
    const idle = Date.now() - this.state.lastStrokeEndTime;
    if (idle > 20000 && this.state.consecutiveFailures > 0) {
      return 'severe';
    }
    if (idle > 15000) {
      return 'moderate';
    }
    return this.currentLevel;
  }

  /** 重置（新一轮开始） */
  reset() {
    this.state = {
      consecutiveFailures: 0,
      consecutiveSkips: 0,
      lastStrokeEndTime: Date.now(),
      recentPressures: [],
      recentSpeeds: [],
      pointerDownTimes: [],
    };
    this.currentLevel = 'normal';
  }

  getLevel(): EmotionLevel {
    return this.currentLevel;
  }

  // ── 内部评估 ────────────────────────────────────────────────────

  private evaluate() {
    let newLevel: EmotionLevel = 'normal';

    // 连续失败
    if (this.state.consecutiveFailures >= 4) newLevel = 'moderate';
    else if (this.state.consecutiveFailures >= 2) newLevel = 'mild';

    // 连续跳过
    if (this.state.consecutiveSkips >= 3) {
      newLevel = this.max(newLevel, 'moderate');
    }

    // 压力过大（最近平均 > 0.8）
    if (this.state.recentPressures.length >= 5) {
      const avgP = this.state.recentPressures.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (avgP > 0.8) newLevel = this.max(newLevel, 'mild');
    }

    // 速度骤增（乱划检测）
    if (this.state.recentSpeeds.length >= 3) {
      const recent = this.state.recentSpeeds.slice(-3);
      const avgSpeed = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (avgSpeed > 200) newLevel = this.max(newLevel, 'moderate'); // 200点/秒 = 乱划
    }

    // 快速反复触碰（拍打行为）
    if (this.state.pointerDownTimes.length >= 5) {
      newLevel = this.max(newLevel, 'moderate');
    }

    if (newLevel !== this.currentLevel) {
      this.currentLevel = newLevel;
      this.onLevelChange?.(newLevel);
    }
  }

  private max(a: EmotionLevel, b: EmotionLevel): EmotionLevel {
    const order: EmotionLevel[] = ['normal', 'mild', 'moderate', 'severe'];
    return order.indexOf(a) >= order.indexOf(b) ? a : b;
  }
}

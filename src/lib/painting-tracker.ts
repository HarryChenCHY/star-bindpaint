/**
 * painting-tracker.ts — 绘画过程数据采集器
 *
 * 记录匿名绘画 session 的过程数据，用于生成学习反馈与研究统计。
 */

import { buildLearningFeedbackPrompt } from '@/lib/learning-feedback';

// ── 类型定义 ────────────────────────────────────────────────────────────

/** 单笔行为记录 */
export interface StrokeRecord {
  /** 第几笔（0-indexed） */
  index: number;
  /** 是否被跳过（用户点了"跳过"或批量AI绘制） */
  skipped: boolean;
  /** 是否是批量AI自动画的 */
  autoBatched: boolean;
  /** 上一笔结束到这一笔开始的等待时间（ms）— 反映犹豫/思考 */
  waitTimeMs: number;
  /** 画这一笔花了多久（ms）— 反映流畅度 */
  drawDurationMs: number;
  /** 用户使用的颜色（CSS color string） */
  color: string;
  /** 笔触中心坐标（画布像素） */
  region: { x: number; y: number };
  /** 与引导线的匹配分数（0-1），跳过的为 -1 */
  matchScore: number;
  /** 时间戳 */
  timestamp: number;
}

/** 完整的绘画 session 数据 */
export interface PaintingSession {
  /** 唯一 ID */
  id: string;
  /** 选择的作品信息 */
  masterwork: {
    id: string;         // "starry_night"
    title: string;      // "星空"
    artist: string;     // "梵高"
  } | null;
  /** 用户自己上传的图（非大师作品时） */
  isCustomUpload: boolean;
  /** 作画模式 */
  mode: 'follow' | 'auto' | 'free';
  /** 进入画板时的模式 */
  initialMode: 'follow' | 'auto' | 'free';
  /** 跟画子模式 */
  guideSubMode: 'assist' | 'real';
  /** 星迹提示强度 */
  guidanceLevel: 'full' | 'balanced' | 'light';
  /** 进入画板时的提示强度 */
  initialGuidanceLevel: 'full' | 'balanced' | 'light';
  /** 笔触密度参数 */
  roughness: number;
  /** Session 开始时间 */
  startTime: number;
  /** 第一次在画布产生输入的时间 */
  firstInputAt: number;
  /** 第一次通过星迹判定的时间 */
  firstAcceptedAt: number;
  /** 画布输入尝试次数 */
  manualAttemptCount: number;
  /** 未通过星迹判定的输入次数 */
  manualRejectedCount: number;
  /** 自动续画启动次数 */
  autoStartCount: number;
  /** 未完成离开画板的时间 */
  abandonedAt: number;
  /** Session 结束时间（点击"完成"时写入） */
  endTime: number;
  /** AI 规划的总笔触数 */
  totalStrokes: number;
  /** 用户手动完成的笔触数 */
  completedStrokes: number;
  /** 用户手动跳过的笔触数 */
  skippedStrokes: number;
  /** 批量 AI 自动画的笔触数 */
  batchedStrokes: number;
  /** 逐笔行为记录 */
  strokes: StrokeRecord[];
  /** 最终画作 base64（完成时写入） */
  finalImageBase64: string;
  /** 画布尺寸 */
  canvasSize: { width: number; height: number };
  /** 自由创作主题 ID */
  themeId?: string;
  /** 自由创作难度（贴纸/描画/自由） */
  difficulty?: 'sticker' | 'tracing' | 'free';
  /** 大师风格（自由模式选的大师） */
  styleId?: string;
}

// ── 采集器类 ────────────────────────────────────────────────────────────

export class PaintingTracker {
  private session: PaintingSession;
  private lastStrokeEndTime: number = 0;
  private currentStrokeStartTime: number = 0;

  constructor() {
    this.session = this.createEmptySession();
  }

  private createEmptySession(): PaintingSession {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      masterwork: null,
      isCustomUpload: true,
      mode: 'follow',
      initialMode: 'follow',
      guideSubMode: 'assist',
      guidanceLevel: 'full',
      initialGuidanceLevel: 'full',
      roughness: 2,
      startTime: 0,
      firstInputAt: 0,
      firstAcceptedAt: 0,
      manualAttemptCount: 0,
      manualRejectedCount: 0,
      autoStartCount: 0,
      abandonedAt: 0,
      endTime: 0,
      totalStrokes: 0,
      completedStrokes: 0,
      skippedStrokes: 0,
      batchedStrokes: 0,
      strokes: [],
      finalImageBase64: '',
      canvasSize: { width: 512, height: 512 },
    };
  }

  // ── 初始化方法 ──────────────────────────────────────────────────────

  /** 设置作品信息（大师图片库选择） */
  setMasterwork(id: string, title: string, artist: string) {
    this.session.masterwork = { id, title, artist };
    this.session.isCustomUpload = false;
  }

  /** 设置为用户自定义上传 */
  setCustomUpload() {
    this.session.masterwork = null;
    this.session.isCustomUpload = true;
  }

  /** 设置模式 */
  setMode(mode: PaintingSession['mode'], guideSubMode: PaintingSession['guideSubMode']) {
    this.session.mode = mode;
    this.session.guideSubMode = guideSubMode;
  }

  setGuidanceLevel(level: PaintingSession['guidanceLevel']) {
    this.session.guidanceLevel = level;
  }

  /** 设置自由创作主题 ID */
  setThemeId(themeId: string) {
    this.session.themeId = themeId;
  }

  setDifficulty(d: 'sticker' | 'tracing' | 'free') {
    this.session.difficulty = d;
  }

  setStyleId(id: string) {
    this.session.styleId = id;
  }

  /** 设置参数 */
  setRoughness(roughness: number) {
    this.session.roughness = roughness;
  }

  /** 设置画布尺寸 */
  setCanvasSize(width: number, height: number) {
    this.session.canvasSize = { width, height };
  }

  /** 开始 session（AI 分析完成、进入作画状态时调用） */
  startSession(totalStrokes: number) {
    this.session.startTime = Date.now();
    this.session.initialMode = this.session.mode;
    this.session.initialGuidanceLevel = this.session.guidanceLevel;
    this.session.totalStrokes = totalStrokes;
    this.lastStrokeEndTime = Date.now();
  }

  // ── 逐笔记录方法 ──────────────────────────────────────────────────

  /** 用户开始画一笔（pointer down 时调用） */
  strokeStart() {
    const now = Date.now();
    this.currentStrokeStartTime = now;
    this.session.manualAttemptCount++;
    if (this.session.firstInputAt === 0) this.session.firstInputAt = now;
  }

  /** 用户完成一笔（通过判定后调用） */
  strokeCompleted(
    index: number,
    color: string,
    region: { x: number; y: number },
    matchScore: number
  ) {
    const now = Date.now();
    const waitTimeMs = this.currentStrokeStartTime > 0
      ? this.currentStrokeStartTime - this.lastStrokeEndTime
      : 0;
    const drawDurationMs = now - this.currentStrokeStartTime;

    this.session.strokes.push({
      index,
      skipped: false,
      autoBatched: false,
      waitTimeMs: Math.max(0, waitTimeMs),
      drawDurationMs: Math.max(0, drawDurationMs),
      color,
      region,
      matchScore,
      timestamp: now,
    });

    this.session.completedStrokes++;
    if (this.session.firstAcceptedAt === 0) this.session.firstAcceptedAt = now;
    this.lastStrokeEndTime = now;
  }

  strokeRejected() {
    this.session.manualRejectedCount++;
  }

  /** 用户跳过一笔 */
  strokeSkipped(index: number, region: { x: number; y: number }) {
    this.session.strokes.push({
      index,
      skipped: true,
      autoBatched: false,
      waitTimeMs: 0,
      drawDurationMs: 0,
      color: '',
      region,
      matchScore: -1,
      timestamp: Date.now(),
    });

    this.session.skippedStrokes++;
    this.lastStrokeEndTime = Date.now();
  }

  /** 批量AI自动画（记录一批） */
  strokesBatched(startIndex: number, count: number) {
    this.session.batchedStrokes += count;
    // 不逐笔记录每一条batch，只记汇总
    this.lastStrokeEndTime = Date.now();
  }

  recordAutoStart() {
    this.session.autoStartCount++;
  }

  // ── 结束方法 ────────────────────────────────────────────────────────

  /** 完成绘画（用户点"保存"或"完成"时调用） */
  finishSession(finalImageBase64: string) {
    this.session.endTime = Date.now();
    this.session.abandonedAt = 0;
    this.session.finalImageBase64 = finalImageBase64;
  }

  abandonSession() {
    if (this.session.startTime > 0 && this.session.endTime === 0 && this.session.abandonedAt === 0) {
      this.session.abandonedAt = Date.now();
    }
  }

  /** 获取完整 session 数据 */
  getSession(): PaintingSession {
    return { ...this.session };
  }

  /** 重置（重新开始） */
  reset() {
    this.session = this.createEmptySession();
    this.lastStrokeEndTime = 0;
    this.currentStrokeStartTime = 0;
  }

  // ── 数据分析方法（用于组装 prompt）────────────────────────────────

  /** 总用时（分钟） */
  getDurationMinutes(): number {
    const end = this.session.endTime || Date.now();
    return Math.round((end - this.session.startTime) / 60000);
  }

  /** 完成率 (0-100) */
  getCompletionRate(): number {
    if (this.session.totalStrokes === 0) return 0;
    return Math.round(
      (this.session.completedStrokes + this.session.batchedStrokes) /
      this.session.totalStrokes * 100
    );
  }

  /** 平均犹豫时间（秒） */
  getAverageWaitTime(): number {
    const userStrokes = this.session.strokes.filter(s => !s.skipped && !s.autoBatched);
    if (userStrokes.length === 0) return 0;
    const totalWait = userStrokes.reduce((sum, s) => sum + s.waitTimeMs, 0);
    return totalWait / userStrokes.length / 1000;
  }

  /** 平均绘制时长（秒） */
  getAverageDrawDuration(): number {
    const userStrokes = this.session.strokes.filter(s => !s.skipped && !s.autoBatched);
    if (userStrokes.length === 0) return 0;
    const totalDraw = userStrokes.reduce((sum, s) => sum + s.drawDurationMs, 0);
    return totalDraw / userStrokes.length / 1000;
  }

  /** 平均匹配分数 (0-1) */
  getAverageMatchScore(): number {
    const scored = this.session.strokes.filter(s => s.matchScore >= 0);
    if (scored.length === 0) return 0;
    return scored.reduce((sum, s) => sum + s.matchScore, 0) / scored.length;
  }

  /** 使用的颜色分布（返回前3主要颜色） */
  getColorDistribution(): { color: string; count: number; percentage: number }[] {
    const userStrokes = this.session.strokes.filter(s => !s.skipped && s.color);
    if (userStrokes.length === 0) return [];

    // 简化：把颜色归类为色系
    const colorMap = new Map<string, number>();
    for (const s of userStrokes) {
      const hue = this.classifyColor(s.color);
      colorMap.set(hue, (colorMap.get(hue) || 0) + 1);
    }

    return Array.from(colorMap.entries())
      .map(([color, count]) => ({
        color,
        count,
        percentage: Math.round(count / userStrokes.length * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  /** 跳过的区域分析（画布分四象限：左上/右上/左下/右下） */
  getSkippedRegionAnalysis(): string {
    const skipped = this.session.strokes.filter(s => s.skipped);
    if (skipped.length === 0) return '无跳过';

    const { width, height } = this.session.canvasSize;
    const midX = width / 2, midY = height / 2;

    const regions = { '左上': 0, '右上': 0, '左下': 0, '右下': 0 };
    for (const s of skipped) {
      const key = `${s.region.x < midX ? '左' : '右'}${s.region.y < midY ? '上' : '下'}` as keyof typeof regions;
      regions[key]++;
    }

    // 返回跳过最多的区域
    const sorted = Object.entries(regions).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    return sorted.map(([k, v]) => `${k}(${v}笔)`).join('、');
  }

  /** 停留最久的区域（犹豫时间最长的笔触集中在哪） */
  getFocusRegion(): string {
    const userStrokes = this.session.strokes.filter(s => !s.skipped && !s.autoBatched);
    if (userStrokes.length === 0) return '未知';

    // 取犹豫时间最长的 top 20% 笔触，看它们集中在哪
    const sorted = [...userStrokes].sort((a, b) => b.waitTimeMs - a.waitTimeMs);
    const top = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2)));

    const { width, height } = this.session.canvasSize;
    const avgX = top.reduce((sum, s) => sum + s.region.x, 0) / top.length;
    const avgY = top.reduce((sum, s) => sum + s.region.y, 0) / top.length;

    // 描述位置
    const xDesc = avgX < width * 0.33 ? '左侧' : avgX > width * 0.66 ? '右侧' : '中部';
    const yDesc = avgY < height * 0.33 ? '上方' : avgY > height * 0.66 ? '下方' : '中间';
    return `${yDesc}${xDesc}`;
  }

  /** 笔触节奏分析 */
  getStrokeRhythm(): string {
    const userStrokes = this.session.strokes.filter(s => !s.skipped && !s.autoBatched);
    if (userStrokes.length < 3) return '数据不足';

    const waitTimes = userStrokes.map(s => s.waitTimeMs);
    const avg = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    const variance = waitTimes.reduce((sum, t) => sum + (t - avg) ** 2, 0) / waitTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg : 0; // 变异系数

    if (cv < 0.3) return '节奏稳定，有规律感';
    if (cv < 0.6) return '节奏适中，偶有停顿';
    return '节奏不规律，有较多犹豫';
  }

  // ── 组装 LLM prompt ───────────────────────────────────────────────

  /** 生成传给 LLM 的完整 prompt（不含图片，图片单独传） */
  buildAnalysisPrompt(): string {
    return buildLearningFeedbackPrompt(this.session);
  }

  // ── 工具方法 ──────────────────────────────────────────────────────

  /** 将 CSS 颜色字符串归类为中文色系名 */
  private classifyColor(cssColor: string): string {
    // 尝试从 rgba(r,g,b,a) 提取
    const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '其他';

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    // 简单 HSL 分类
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;

    if (max - min < 30) {
      if (l > 0.7) return '白色/浅色';
      if (l < 0.3) return '黑色/深色';
      return '灰色';
    }

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

  /** 导出埋点 JSON（上传到 OSS sessions/） */
  toAnalyticsJSON() {
    const s = this.session;
    return {
      schemaVersion: 2,
      recordType: 'session',
      dataQuality: 'complete',
      id: s.id,
      sessionId: s.id,
      startTime: s.startTime,
      canvasReadyAt: s.startTime,
      startedAt: s.startTime > 0 ? toBeijingTime(s.startTime) : null,
      endTime: s.endTime,
      endedAt: s.endTime > 0 ? toBeijingTime(s.endTime) : null,
      abandonedAt: s.abandonedAt || null,
      outcome: s.endTime > 0 ? 'completed' : s.abandonedAt > 0 ? 'abandoned' : 'in_progress',
      durationSec: (s.endTime > 0 || s.abandonedAt > 0)
        ? Math.round(((s.endTime || s.abandonedAt) - s.startTime) / 1000)
        : 0,
      mode: s.mode,
      initialMode: s.initialMode,
      guideSubMode: s.guideSubMode,
      guidanceLevel: s.guidanceLevel,
      initialGuidanceLevel: s.initialGuidanceLevel,
      difficulty: s.difficulty || null,
      styleId: s.styleId || null,
      themeId: s.themeId || null,
      isCustomUpload: s.isCustomUpload,
      roughness: s.roughness,
      totalStrokes: s.totalStrokes,
      completedStrokes: s.completedStrokes,
      manualAttemptCount: s.manualAttemptCount,
      manualAcceptedCount: s.completedStrokes,
      manualRejectedCount: s.manualRejectedCount,
      skippedStrokes: s.skippedStrokes,
      batchedStrokes: s.batchedStrokes,
      aiRenderedCount: s.batchedStrokes,
      autoStartCount: s.autoStartCount,
      firstPointerAt: s.firstInputAt || null,
      firstAcceptedAt: s.firstAcceptedAt || null,
      firstStrokeLatencySec: s.firstInputAt > 0 && s.startTime > 0
        ? Math.max(0, (s.firstInputAt - s.startTime) / 1000)
        : null,
      manualContributionRate: s.totalStrokes > 0
        ? Math.min(100, s.completedStrokes / s.totalStrokes * 100)
        : s.completedStrokes > 0 ? 100 : null,
      aiAssistanceRate: s.totalStrokes > 0
        ? Math.min(100, s.batchedStrokes / s.totalStrokes * 100)
        : null,
      completionRate: s.totalStrokes > 0
        ? Math.min(100, (s.completedStrokes + s.batchedStrokes) / s.totalStrokes * 100)
        : null,
      contentCoverageRate: s.totalStrokes > 0
        ? Math.min(100, (s.completedStrokes + s.batchedStrokes) / s.totalStrokes * 100)
        : null,
      starTraceProgressRate: s.totalStrokes > 0
        ? Math.min(100, (s.completedStrokes + s.batchedStrokes + s.skippedStrokes) / s.totalStrokes * 100)
        : null,
      avgWaitTimeSec: this.getAverageWaitTime(),
      avgDrawDurationSec: this.getAverageDrawDuration(),
      strokeRhythm: this.getStrokeRhythm(),
    };
  }
}

function toBeijingTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

// ── 单例导出（全局使用一个 tracker）────────────────────────────────────

let _globalTracker: PaintingTracker | null = null;

export function getTracker(): PaintingTracker {
  if (!_globalTracker) {
    _globalTracker = new PaintingTracker();
  }
  return _globalTracker;
}

export function resetTracker(): PaintingTracker {
  _globalTracker = new PaintingTracker();
  return _globalTracker;
}

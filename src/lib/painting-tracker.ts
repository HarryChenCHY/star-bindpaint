/**
 * painting-tracker.ts — 绘画过程数据采集器
 *
 * 记录用户整个作画 session 的行为数据：
 * - 选了什么画、什么情绪
 * - 每一笔的犹豫时间、绘制时长、颜色、区域、是否跳过、匹配分数
 * - 总用时、完成度
 * - 最终画面截图
 *
 * 这些数据最终传给 LLM 做绘画观察报告。
 */

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
  /** 选择的情绪/色调 */
  mood: string;
  /** 作画模式 */
  mode: 'follow' | 'auto' | 'free';
  /** 跟画子模式 */
  guideSubMode: 'assist' | 'real';
  /** 笔触密度参数 */
  roughness: number;
  /** Session 开始时间 */
  startTime: number;
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
      mood: '',
      mode: 'follow',
      guideSubMode: 'assist',
      roughness: 2,
      startTime: 0,
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

  /** 设置情绪/色调选择 */
  setMood(mood: string) {
    this.session.mood = mood;
  }

  /** 设置模式 */
  setMode(mode: PaintingSession['mode'], guideSubMode: PaintingSession['guideSubMode']) {
    this.session.mode = mode;
    this.session.guideSubMode = guideSubMode;
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
    this.session.totalStrokes = totalStrokes;
    this.lastStrokeEndTime = Date.now();
  }

  // ── 逐笔记录方法 ──────────────────────────────────────────────────

  /** 用户开始画一笔（pointer down 时调用） */
  strokeStart() {
    this.currentStrokeStartTime = Date.now();
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
    this.lastStrokeEndTime = now;
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

  // ── 结束方法 ────────────────────────────────────────────────────────

  /** 完成绘画（用户点"保存"或"完成"时调用） */
  finishSession(finalImageBase64: string) {
    this.session.endTime = Date.now();
    this.session.finalImageBase64 = finalImageBase64;
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
    const s = this.session;
    const duration = this.getDurationMinutes();
    const completion = this.getCompletionRate();
    const avgWait = this.getAverageWaitTime();
    const avgDraw = this.getAverageDrawDuration();
    const avgScore = this.getAverageMatchScore();
    const colors = this.getColorDistribution();
    const skippedRegion = this.getSkippedRegionAnalysis();
    const focusRegion = this.getFocusRegion();
    const rhythm = this.getStrokeRhythm();

    const workInfo = s.masterwork
      ? `临摹${s.masterwork.artist}《${s.masterwork.title}》`
      : '用户自选图片';

    const moodInfo = s.mood ? `，选择了"${s.mood}"情绪色调` : '';
    const colorInfo = colors.length > 0
      ? colors.map(c => `${c.color}(${c.percentage}%)`).join('、')
      : '未记录';

    return `你是一位温和专业的儿童艺术治疗观察员。以下是一位儿童今天的绘画过程数据。请基于数据写一份简短的观察记录。

要求：
- 用温暖、非诊断性的语言
- 关注：色彩偏好、专注区域、笔触节奏、情绪状态的可能线索
- 不使用任何医学/心理学诊断术语
- 以"观察"和"发现"的口吻，不下定论
- 输出 3-5 句话的观察段落 + 一个简短的"今日关键词"（1-3个词）

【作品选择】${workInfo}${moodInfo}
【作画模式】${s.mode === 'follow' ? '跟画模式' : s.mode === 'auto' ? '自动观看' : '自由创作'}（${s.guideSubMode === 'assist' ? '辅助' : '真实'}）
【时间数据】总用时 ${duration} 分钟，完成 ${completion}% 笔触（共 ${s.totalStrokes} 笔，手动 ${s.completedStrokes} 笔，跳过 ${s.skippedStrokes} 笔，AI辅助 ${s.batchedStrokes} 笔）
【犹豫与节奏】平均犹豫 ${avgWait.toFixed(1)}s，平均绘制 ${avgDraw.toFixed(1)}s/笔，${rhythm}
【匹配度】平均匹配分数 ${(avgScore * 100).toFixed(0)}%
【专注区域】停留最久的区域：${focusRegion}
【跳过区域】${skippedRegion}
【色彩偏好】主要使用：${colorInfo}
【附图】见附图（用户最终完成的画作）`;
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

/**
 * drawing-engine.ts — Canvas 手绘引擎
 * 处理 pointer events，生成平滑笔迹
 */

import { Vec2 } from './stroke-engine';

export interface DrawingPoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface UserStroke {
  points: DrawingPoint[];
  color: string;
  baseWidth: number;
}

/**
 * Canvas 手绘控制器
 */
export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing = false;
  private activePointerId = -1;
  private currentStroke: DrawingPoint[] = [];
  private color = 'rgba(100, 100, 100, 0.85)';
  private baseWidth = 4;
  private onStrokeEnd?: (stroke: UserStroke) => void;

  constructor(canvas: HTMLCanvasElement, onStrokeEnd?: (stroke: UserStroke) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStrokeEnd = onStrokeEnd;
    this.bindEvents();
  }

  setColor(color: string) {
    this.color = color;
  }

  setWidth(width: number) {
    this.baseWidth = width;
  }

  private bindEvents() {
    this.canvas.addEventListener('pointerdown', this.handleDown);
    this.canvas.addEventListener('pointermove', this.handleMove);
    this.canvas.addEventListener('pointerup', this.handleUp);
    this.canvas.addEventListener('pointerleave', this.handleLeave);
    // 安全网：document 级别的 pointerup 确保释放捕获
    document.addEventListener('pointerup', this.handleDocumentUp);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.handleDown);
    this.canvas.removeEventListener('pointermove', this.handleMove);
    this.canvas.removeEventListener('pointerup', this.handleUp);
    this.canvas.removeEventListener('pointerleave', this.handleLeave);
    document.removeEventListener('pointerup', this.handleDocumentUp);
  }

  private getCanvasPoint(e: PointerEvent): DrawingPoint {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
      timestamp: performance.now(),
    };
  }

  private handleDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只处理主指针（防止多点触控干扰）
    if (!e.isPrimary) return;
    // 安全清理：如果上一笔未正确结束，先完成它
    if (this.isDrawing) {
      this.finishStroke();
    }
    this.canvas.setPointerCapture(e.pointerId);
    this.isDrawing = true;
    this.activePointerId = e.pointerId;
    this.currentStroke = [this.getCanvasPoint(e)];
  };

  private handleMove = (e: PointerEvent) => {
    if (!this.isDrawing) return;
    // 只处理同一个 pointer（核心防飞线逻辑）
    if (e.pointerId !== this.activePointerId) return;
    e.preventDefault();
    e.stopPropagation();

    const point = this.getCanvasPoint(e);

    // 边界检查：坐标必须在画布内
    if (point.x < -5 || point.y < -5 || point.x > this.canvas.width + 5 || point.y > this.canvas.height + 5) return;

    // 防飞线：距离阈值 + 时间检测
    if (this.currentStroke.length > 0) {
      const last = this.currentStroke[this.currentStroke.length - 1];
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = point.timestamp - last.timestamp;
      // 单帧跳跃超过 60px 或速度异常高（>5px/ms）= 飞线
      if (dist > 60) return;
      if (dt > 0 && dist / dt > 5) return;
      if (dist < 0.5) return; // 太近无意义
    }

    this.currentStroke.push(point);

    // Draw incrementally
    if (this.currentStroke.length >= 2) {
      const pts = this.currentStroke;
      const i = pts.length - 1;
      this.drawSegment(pts[Math.max(0, i - 2)], pts[Math.max(0, i - 1)], pts[i], pts[i], point.pressure);
    }
  };

  private handleUp = (e: PointerEvent) => {
    if (!this.isDrawing) return;
    if (e.pointerId !== this.activePointerId) return;
    this.finishStroke();
    try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
  };

  private handleLeave = (e: PointerEvent) => {
    if (!this.isDrawing) return;
    this.finishStroke();
    try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
  };

  private handleDocumentUp = () => {
    // 安全网：无论如何确保绘画状态结束
    if (this.isDrawing) {
      this.finishStroke();
    }
  };

  private finishStroke() {
    this.isDrawing = false;
    if (this.currentStroke.length >= 2 && this.onStrokeEnd) {
      this.onStrokeEnd({
        points: [...this.currentStroke],
        color: this.color,
        baseWidth: this.baseWidth,
      });
    }
    this.currentStroke = [];
  }

  private drawSegment(p0: DrawingPoint, p1: DrawingPoint, p2: DrawingPoint, p3: DrawingPoint, pressure: number) {
    const ctx = this.ctx;
    const width = this.baseWidth * (0.5 + pressure);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    // Catmull-Rom to Bezier
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    ctx.stroke();
  }

  /**
   * 重绘整条笔迹到指定 canvas context
   */
  static redrawStroke(ctx: CanvasRenderingContext2D, stroke: UserStroke) {
    if (stroke.points.length < 2) return;
    const pts = stroke.points;

    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      ctx.lineWidth = stroke.baseWidth * (0.5 + p1.pressure);

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
  }
}

/**
 * 计算用户笔迹与引导线的匹配程度（简化 Hausdorff）
 * 返回 0-1 之间的匹配分数（1=完美匹配）
 */
export function matchScore(userPoints: Vec2[], guidePoints: Vec2[]): number {
  if (userPoints.length < 2 || guidePoints.length < 2) return 0;

  // 采样一些点进行比较
  const sampleN = Math.min(10, userPoints.length);
  let totalDist = 0;

  for (let i = 0; i < sampleN; i++) {
    const t = i / (sampleN - 1);
    const idx = Math.min(Math.floor(t * (userPoints.length - 1)), userPoints.length - 1);
    const up = userPoints[idx];

    // 找引导线上最近点
    let minDist = Infinity;
    for (const gp of guidePoints) {
      const dx = up.x - gp.x, dy = up.y - gp.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }
    totalDist += minDist;
  }

  const avgDist = totalDist / sampleN;
  // 将距离映射到 0-1 分数（50px 内为满分区间）
  const score = Math.max(0, 1 - avgDist / 80);
  return score;
}

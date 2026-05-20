'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingEngine, matchScore } from '@/lib/drawing-engine';
import { drawStroke, drawGuideStroke, StrokeDrawData, Vec2 } from '@/lib/stroke-engine';
import { MasterStyleProfile, stylizeStroke, drawStylizedStroke } from '@/lib/style-transfer';

export type PaintMode = 'follow' | 'auto' | 'free';

interface PaintCanvasProps {
  width: number;
  height: number;
  mode: PaintMode;
  strokes: StrokeDrawData[];
  currentGuideStroke: StrokeDrawData | null;
  guideSubMode: 'assist' | 'real';
  brushColor?: string;
  brushWidth?: number;
  autoSpeed?: number;
  masterStyle?: MasterStyleProfile | null;
  freeColor?: [number, number, number];
  onUserStrokeDone?: (userPoints: Vec2[], score: number) => void;
  onUserStrokeStart?: () => void;
  onAutoProgress?: (current: number, total: number) => void;
  onAutoComplete?: () => void;
  sourceImage?: HTMLImageElement | null;
}

export default function PaintCanvas({
  width,
  height,
  mode,
  strokes,
  currentGuideStroke,
  guideSubMode,
  brushColor,
  brushWidth = 4,
  autoSpeed = 30,
  masterStyle,
  freeColor,
  onUserStrokeDone,
  onUserStrokeStart,
  onAutoProgress,
  onAutoComplete,
  sourceImage,
}: PaintCanvasProps) {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);      // Layer 1: 已完成笔触
  const userCanvasRef = useRef<HTMLCanvasElement>(null);      // Layer 2: 用户绘制
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);     // Layer 3: 引导线
  const drawingEngineRef = useRef<DrawingEngine | null>(null);
  const autoPlayRef = useRef<{ running: boolean; timeoutId: number }>({ running: false, timeoutId: 0 });
  const [autoIdx, setAutoIdx] = useState(0);

  // 初始化手绘引擎（跟画/自由模式）
  useEffect(() => {
    const userCanvas = userCanvasRef.current;
    if (!userCanvas || mode === 'auto') return;

    // 监听 pointerdown 通知 tracker
    const handlePointerDown = () => { onUserStrokeStart?.(); };
    userCanvas.addEventListener('pointerdown', handlePointerDown);

    const engine = new DrawingEngine(userCanvas, (stroke) => {
      if (mode === 'follow' && currentGuideStroke && onUserStrokeDone) {
        const userPts: Vec2[] = stroke.points.map(p => ({ x: p.x, y: p.y }));
        const score = matchScore(userPts, currentGuideStroke.points);
        onUserStrokeDone(userPts, score);
      } else if (mode === 'free' && onUserStrokeDone) {
        const userPts: Vec2[] = stroke.points.map(p => ({ x: p.x, y: p.y }));

        // 风格化：如果有 masterStyle，将笔迹转换为油画风格
        if (masterStyle) {
          const pressures = stroke.points.map(p => p.pressure);
          const color: [number, number, number] = freeColor || [0.2, 0.2, 0.2];
          const segments = stylizeStroke(userPts, pressures, color, masterStyle);

          // 清除用户层的原始笔迹
          const userCtx = userCanvas.getContext('2d');
          if (userCtx) userCtx.clearRect(0, 0, width, height);

          // 渲染风格化笔触到基础层
          const baseCanvas = baseCanvasRef.current;
          if (baseCanvas) {
            const baseCtx = baseCanvas.getContext('2d');
            if (baseCtx) drawStylizedStroke(baseCtx, segments);
          }
        }

        onUserStrokeDone(userPts, 1);
      }
    });

    drawingEngineRef.current = engine;
    return () => {
      userCanvas.removeEventListener('pointerdown', handlePointerDown);
      engine.destroy();
      drawingEngineRef.current = null;
    };
  }, [mode, currentGuideStroke, onUserStrokeDone, onUserStrokeStart, masterStyle, freeColor, width, height]);

  // 更新画笔颜色/宽度
  useEffect(() => {
    if (drawingEngineRef.current) {
      if (brushColor) drawingEngineRef.current.setColor(brushColor);
      drawingEngineRef.current.setWidth(brushWidth);
    }
  }, [brushColor, brushWidth]);

  // 在跟画模式下，自动设置画笔颜色为当前引导笔触颜色
  useEffect(() => {
    if (mode === 'follow' && currentGuideStroke && drawingEngineRef.current) {
      const [r, g, b] = currentGuideStroke.color;
      const color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0.85)`;
      drawingEngineRef.current.setColor(color);
      drawingEngineRef.current.setWidth(Math.max(2, currentGuideStroke.width));
    }
  }, [mode, currentGuideStroke]);

  // 绘制引导线
  useEffect(() => {
    const guideCanvas = guideCanvasRef.current;
    if (!guideCanvas) return;
    const ctx = guideCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    if (mode === 'follow' && currentGuideStroke) {
      drawGuideStroke(ctx, currentGuideStroke);
    }
  }, [mode, currentGuideStroke, width, height]);

  // 自动播放模式
  useEffect(() => {
    if (mode !== 'auto') {
      autoPlayRef.current.running = false;
      return;
    }

    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas || strokes.length === 0) return;
    const ctx = baseCanvas.getContext('2d')!;

    autoPlayRef.current.running = true;
    let idx = autoIdx;

    function playNext() {
      if (!autoPlayRef.current.running || idx >= strokes.length) {
        autoPlayRef.current.running = false;
        if (idx >= strokes.length && onAutoComplete) onAutoComplete();
        return;
      }

      drawStroke(ctx, strokes[idx]);
      idx++;
      setAutoIdx(idx);
      if (onAutoProgress) onAutoProgress(idx, strokes.length);

      autoPlayRef.current.timeoutId = window.setTimeout(playNext, autoSpeed);
    }

    playNext();

    return () => {
      autoPlayRef.current.running = false;
      clearTimeout(autoPlayRef.current.timeoutId);
    };
  }, [mode, strokes, autoSpeed]);

  // 绘制辅助模式下的 AI 笔触替换
  const drawAIStrokeOnBase = useCallback((stroke: StrokeDrawData) => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d')!;
    drawStroke(ctx, stroke);
  }, []);

  // 公开方法给父组件调用
  useEffect(() => {
    // 暴露到 window 给其他逻辑使用
    (window as unknown as Record<string, unknown>).__paintCanvas = {
      drawAIStrokeOnBase,
      clearUser: () => {
        const userCanvas = userCanvasRef.current;
        if (userCanvas) {
          const ctx = userCanvas.getContext('2d')!;
          ctx.clearRect(0, 0, width, height);
        }
      },
      clearAll: () => {
        [baseCanvasRef, userCanvasRef, guideCanvasRef].forEach(ref => {
          if (ref.current) {
            const ctx = ref.current.getContext('2d')!;
            ctx.clearRect(0, 0, width, height);
          }
        });
        setAutoIdx(0);
      },
      getBaseCanvas: () => baseCanvasRef.current,
    };
  }, [drawAIStrokeOnBase, width, height]);

  // 绘制半透明源图（参考层）
  useEffect(() => {
    if (sourceImage && baseCanvasRef.current) {
      const ctx = baseCanvasRef.current.getContext('2d')!;
      ctx.globalAlpha = 0.08;
      ctx.drawImage(sourceImage, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }, [sourceImage, width, height]);

  return (
    <div className="relative overflow-hidden" style={{ width, height, borderRadius: '1.75rem', border: '2px solid #1A1A1A' }}>
      {/* Layer 1: Base / completed strokes */}
      <canvas
        ref={baseCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 bg-white rounded-2xl"
      />
      {/* Layer 2: User drawing */}
      <canvas
        ref={userCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 paint-canvas"
        style={mode === 'auto' ? { cursor: 'default' } : undefined}
      />
      {/* Layer 3: Guide overlay */}
      <canvas
        ref={guideCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
}

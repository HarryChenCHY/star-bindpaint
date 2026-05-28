'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingEngine, matchScore } from '@/lib/drawing-engine';
import { drawStroke, drawGuideStroke, StrokeDrawData, Vec2 } from '@/lib/stroke-engine';
import { MasterStyleProfile, stylizeStroke, drawStylizedStroke } from '@/lib/style-transfer';
import { renderSprayDot } from '@/lib/spray-engine';
import TracingSceneLayer from '@/components/TracingSceneLayer';

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
  autoStartIdx?: number;
  masterStyle?: MasterStyleProfile | null;
  freeColor?: [number, number, number];
  eraserMode?: boolean;
  sprayMode?: boolean;
  freeSat?: number;
  freeVal?: number;
  onUserStrokeDone?: (userPoints: Vec2[], score: number) => void;
  onUserStrokeStart?: () => void;
  onUndoAvailable?: (available: boolean) => void;
  children?: React.ReactNode;
  onAutoProgress?: (current: number, total: number) => void;
  onAutoComplete?: () => void;
  sourceImage?: HTMLImageElement | null;
  /** 描画临摹：固定场景图，绘制在画布底层 */
  tracingSceneSrc?: string | null;
  tracingSceneVisible?: boolean;
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
  autoStartIdx,
  masterStyle,
  freeColor,
  eraserMode = false,
  sprayMode = false,
  freeSat = 1,
  freeVal = 1,
  onUserStrokeDone,
  onUserStrokeStart,
  onUndoAvailable,
  children,
  onAutoProgress,
  onAutoComplete,
  sourceImage,
  tracingSceneSrc,
  tracingSceneVisible = true,
}: PaintCanvasProps) {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);      // Layer 1: 已完成笔触
  const userCanvasRef = useRef<HTMLCanvasElement>(null);      // Layer 2: 用户绘制
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);     // Layer 3: 引导线
  const undoStackRef = useRef<ImageData[]>([]);               // 撤销栈（自由模式）
  const drawingEngineRef = useRef<DrawingEngine | null>(null);
  const autoPlayRef = useRef<{ running: boolean; timeoutId: number }>({ running: false, timeoutId: 0 });
  const eraserModeRef = useRef(eraserMode);                   // 用 ref 避免引擎重建
  eraserModeRef.current = eraserMode;
  const sprayModeRef = useRef(sprayMode);
  sprayModeRef.current = sprayMode;
  const sprayIsDownRef = useRef(false);                        // 喷雾是否按下中
  const [autoIdx, setAutoIdx] = useState(0);
  const autoStartIdxRef = useRef(0);
  autoStartIdxRef.current = autoStartIdx ?? 0;

  // 初始化手绘引擎（跟画/自由模式）
  useEffect(() => {
    const userCanvas = userCanvasRef.current;
    if (!userCanvas || mode === 'auto' || sprayMode || eraserMode) return;

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
          const segments = stylizeStroke(userPts, pressures, color, masterStyle, brushWidth, freeSat, freeVal);

          // 清除用户层的原始笔迹
          const userCtx = userCanvas.getContext('2d');
          if (userCtx) userCtx.clearRect(0, 0, width, height);

          // 渲染风格化笔触到基础层（之前先存快照）
          const baseCanvas = baseCanvasRef.current;
          if (baseCanvas) {
            const baseCtx = baseCanvas.getContext('2d');
            if (baseCtx) {
              const snapshot = baseCtx.getImageData(0, 0, width, height);
              undoStackRef.current.push(snapshot);
              if (undoStackRef.current.length > 30) undoStackRef.current.shift();
              onUndoAvailable?.(true);

              drawStylizedStroke(baseCtx, segments);
            }
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
  }, [mode, currentGuideStroke, onUserStrokeDone, onUserStrokeStart, masterStyle, freeColor, freeSat, freeVal, sprayMode, eraserMode, width, height, onUndoAvailable]);

  // 橡皮擦模式：独立 pointer 事件，直接在 baseCanvas 上擦除
  useEffect(() => {
    if (!eraserMode || mode !== 'free') return;
    const userCanvas = userCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!userCanvas || !baseCanvas) return;

    userCanvas.style.cursor = 'url(/cursors/eraser.svg) 8 8, crosshair';
    const eraserSize = Math.max(12, (brushWidth || 4) * 3);
    const eraserIsDownRef = { current: false };

    const handleDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      e.preventDefault();
      eraserIsDownRef.current = true;

      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        const snapshot = baseCtx.getImageData(0, 0, width, height);
        undoStackRef.current.push(snapshot);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        onUndoAvailable?.(true);
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (!eraserIsDownRef.current) return;
      e.preventDefault();
      const rect = userCanvas.getBoundingClientRect();
      const scaleX = baseCanvas.width / rect.width;
      const scaleY = baseCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        baseCtx.globalCompositeOperation = 'destination-out';
        baseCtx.beginPath();
        baseCtx.arc(x, y, eraserSize, 0, Math.PI * 2);
        baseCtx.fill();
        baseCtx.globalCompositeOperation = 'source-over';
      }
    };

    const handleUp = () => {
      eraserIsDownRef.current = false;
    };

    userCanvas.addEventListener('pointerdown', handleDown);
    userCanvas.addEventListener('pointermove', handleMove);
    userCanvas.addEventListener('pointerup', handleUp);
    userCanvas.addEventListener('pointerleave', handleUp);

    return () => {
      userCanvas.removeEventListener('pointerdown', handleDown);
      userCanvas.removeEventListener('pointermove', handleMove);
      userCanvas.removeEventListener('pointerup', handleUp);
      userCanvas.removeEventListener('pointerleave', handleUp);
      eraserIsDownRef.current = false;
      userCanvas.style.cursor = '';
    };
  }, [eraserMode, mode, width, height, brushWidth, onUndoAvailable]);

  // 喷雾模式：监听 pointer 事件，直接在 baseCanvas 上喷洒色点
  useEffect(() => {
    if (!sprayMode || mode !== 'free') return;
    const userCanvas = userCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!userCanvas || !baseCanvas) return;

    userCanvas.style.cursor = 'crosshair';

    const handleSprayDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      e.preventDefault();
      sprayIsDownRef.current = true;

      // 存快照（支持撤销）
      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        const snapshot = baseCtx.getImageData(0, 0, width, height);
        undoStackRef.current.push(snapshot);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        onUndoAvailable?.(true);
      }
    };

    const handleSprayMove = (e: PointerEvent) => {
      if (!sprayIsDownRef.current) return;
      e.preventDefault();
      const rect = userCanvas.getBoundingClientRect();
      const scaleX = baseCanvas.width / rect.width;
      const scaleY = baseCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const pressure = e.pressure || 0.5;

      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        renderSprayDot(
          baseCtx, x, y, pressure,
          freeColor || [0.2, 0.2, 0.2],
          brushWidth || 6,
          masterStyle,
          freeSat,
          freeVal
        );
      }

      onUserStrokeDone?.([{ x, y }], 1);
    };

    const handleSprayUp = () => {
      sprayIsDownRef.current = false;
    };

    userCanvas.addEventListener('pointerdown', handleSprayDown);
    userCanvas.addEventListener('pointermove', handleSprayMove);
    userCanvas.addEventListener('pointerup', handleSprayUp);
    userCanvas.addEventListener('pointerleave', handleSprayUp);

    return () => {
      userCanvas.removeEventListener('pointerdown', handleSprayDown);
      userCanvas.removeEventListener('pointermove', handleSprayMove);
      userCanvas.removeEventListener('pointerup', handleSprayUp);
      userCanvas.removeEventListener('pointerleave', handleSprayUp);
      sprayIsDownRef.current = false;
      userCanvas.style.cursor = '';
    };
  }, [sprayMode, mode, width, height, freeColor, freeSat, freeVal, brushWidth, masterStyle, onUndoAvailable, onUserStrokeDone]);

  // 更新画笔颜色/宽度（含橡皮擦模式切换）
  useEffect(() => {
    const engine = drawingEngineRef.current;
    if (!engine) return;
    if (eraserMode) {
      engine.setColor('rgba(255,255,255,1)');
      engine.setWidth(Math.max(12, (brushWidth || 4) * 3));
    } else if (mode === 'free') {
      const [r, g, b] = freeColor || [0.2, 0.2, 0.2];
      const s = (freeSat ?? 1) * (freeVal ?? 1);
      engine.setColor(`rgba(${Math.round(r * s * 255)},${Math.round(g * s * 255)},${Math.round(b * s * 255)},0.85)`);
      engine.setWidth(brushWidth || 4);
    } else {
      if (brushColor) engine.setColor(brushColor);
      engine.setWidth(brushWidth || 4);
    }
  }, [eraserMode, brushColor, brushWidth, freeColor, freeSat, freeVal, mode]);

  // 在跟画模式下，自动设置画笔颜色为当前引导笔触颜色
  useEffect(() => {
    if (mode === 'follow' && currentGuideStroke && drawingEngineRef.current) {
      const [r, g, b] = currentGuideStroke.color;
      const color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0.85)`;
      drawingEngineRef.current.setColor(color);
      drawingEngineRef.current.setWidth(brushWidth || Math.max(2, currentGuideStroke.width));
    }
  }, [mode, currentGuideStroke, brushWidth]);

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
    let idx = autoStartIdxRef.current;

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
  }, [mode, strokes, autoSpeed, onAutoComplete, onAutoProgress]);

  // 绘制辅助模式下的 AI 笔触替换
  const drawAIStrokeOnBase = useCallback((stroke: StrokeDrawData) => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d')!;
    drawStroke(ctx, stroke);
  }, []);

  // 公开方法给父组件调用
  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return false;
    const snapshot = stack.pop()!;
    const baseCanvas = baseCanvasRef.current;
    if (baseCanvas) {
      const ctx = baseCanvas.getContext('2d');
      if (ctx) ctx.putImageData(snapshot, 0, 0);
    }
    onUndoAvailable?.(stack.length > 0);
    return true;
  }, [onUndoAvailable]);

  const saveUndoSnapshot = useCallback(() => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, width, height);
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    onUndoAvailable?.(true);
  }, [width, height, onUndoAvailable]);

  const canUndo = useCallback(() => undoStackRef.current.length > 0, []);

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
        undoStackRef.current = [];
        setAutoIdx(0);
        onUndoAvailable?.(false);
      },
      setAutoIdx,
      getBaseCanvas: () => baseCanvasRef.current,
      saveUndoSnapshot,
      undo,
      canUndo,
    };
  }, [drawAIStrokeOnBase, undo, canUndo, saveUndoSnapshot, width, height, onUndoAvailable]);

  // 绘制半透明源图（参考层）
  useEffect(() => {
    if (sourceImage && baseCanvasRef.current) {
      const ctx = baseCanvasRef.current.getContext('2d')!;
      ctx.globalAlpha = 0.08;
      ctx.drawImage(sourceImage, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }, [sourceImage, width, height]);

  // 描画临摹：固定场景图铺底（DOM 层，SVG viewBox 比 canvas drawImage 更可靠）
  const showTracingScene = Boolean(tracingSceneSrc && tracingSceneVisible);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: '100%',
        aspectRatio: `${width} / ${height}`,
        maxWidth: '100%',
        maxHeight: '100%',
        margin: 'auto',
        borderRadius: '1.75rem',
        border: '2px solid #1A1A1A',
        boxShadow: '6px 6px 0 #1A1A1A',
      }}
    >
      {/* Layer 1: Base / completed strokes */}
      <canvas
        ref={baseCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 bg-white"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Layer 1.5: Tracing scene underlay */}
      {showTracingScene && (
        <TracingSceneLayer src={tracingSceneSrc!} visible={tracingSceneVisible} />
      )}
      {/* Layer 2: User drawing */}
      <canvas
        ref={userCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 paint-canvas"
        style={{
          width: '100%',
          height: '100%',
          zIndex: 2,
          ...(mode === 'auto' ? { cursor: 'default' } : null),
        }}
      />
      {/* Layer 3: Guide overlay */}
      <canvas
        ref={guideCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%', zIndex: 3 }}
      />
      {/* Layer 4: Sticker overlay (children) */}
      <div className="absolute inset-0" style={{ zIndex: 4 }}>
        {children}
      </div>
    </div>
  );
}

'use client';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { PlannedStroke, StudyEvent } from '@/lib/study/protocol';
import { PHASE_LABEL, PROTOCOL } from '@/lib/study/protocol';

type Point = { x: number; y: number };
type Mark = {
  points: Point[];
  color: string;
  width: number;
  layer: 'outline' | 'color';
  tool: string;
};
export interface CanvasHandle {
  freeze: () => string;
  snapshot: () => string;
  interrupt: () => void;
}
interface Props {
  width: number;
  height: number;
  enabled: boolean;
  guide?: PlannedStroke;
  timeLimitMs?: number;
  now: () => number;
  onEvent: (type: string, payload?: StudyEvent['payload']) => void;
  onStroke?: (points: Point[]) => void;
}
export const StudyCanvas = forwardRef<CanvasHandle, Props>(function StudyCanvas(
  {
    width,
    height,
    enabled,
    guide,
    now,
    onEvent,
    onStroke,
    timeLimitMs = Infinity,
  },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null),
    marks = useRef<Mark[]>([]),
    redo = useRef<Mark[]>([]);
  const active = useRef<{
      pointerId: number;
      mark: Mark;
      start: number;
      id: string;
    } | null>(null),
    frozen = useRef(false);
  const [color, setColor] = useState('#273648'),
    [brushWidth, setWidth] = useState(8);
  const [tool, setTool] = useState('brush'),
    [layer, setLayer] = useState<'outline' | 'color'>('outline');
  function draw(target: HTMLCanvasElement, includeActive = true) {
    const ctx = target.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    for (const name of ['color', 'outline']) {
      const buffer = document.createElement('canvas');
      buffer.width = width;
      buffer.height = height;
      const b = buffer.getContext('2d')!;
      const list = [
        ...marks.current,
        ...(includeActive && active.current ? [active.current.mark] : []),
      ];
      for (const mark of list.filter((m) => m.layer === name)) {
        b.globalCompositeOperation =
          mark.tool === 'eraser' ? 'destination-out' : 'source-over';
        b.strokeStyle = mark.color;
        b.fillStyle = mark.color;
        b.lineWidth = mark.width;
        b.lineCap = 'round';
        b.lineJoin = 'round';
        b.beginPath();
        b.moveTo(mark.points[0].x, mark.points[0].y);
        mark.points.slice(1).forEach((p) => b.lineTo(p.x, p.y));
        if (mark.points.length === 1) {
          b.arc(
            mark.points[0].x,
            mark.points[0].y,
            mark.width / 2,
            0,
            Math.PI * 2,
          );
          b.fill();
        } else b.stroke();
      }
      ctx.drawImage(buffer, 0, 0);
    }
  }
  function end(cancel = false) {
    const a = active.current;
    if (!a) return;
    active.current = null;
    marks.current.push(a.mark);
    redo.current = [];
    const length =
      a.mark.points
        .slice(1)
        .reduce(
          (s, p, i) =>
            s + Math.hypot(p.x - a.mark.points[i].x, p.y - a.mark.points[i].y),
          0,
        ) / Math.hypot(width, height);
    onEvent(cancel ? 'stroke_cancelled' : 'stroke_ended', {
      strokeId: a.id,
      startedMs: a.start,
      lengthRatio: length,
      valid: !cancel && length > PROTOCOL.validLengthRatio,
      tool: a.mark.tool,
      layer: a.mark.layer,
    });
    if (!cancel && a.mark.tool === 'brush') onStroke?.(a.mark.points);
    if (canvas.current) draw(canvas.current);
  }
  function snapshot() {
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    draw(out);
    return out.toDataURL('image/png');
  }
  useImperativeHandle(ref, () => ({
    freeze: () => {
      frozen.current = true;
      end(true);
      return snapshot();
    },
    snapshot,
    interrupt: () => end(true),
  }));
  function point(e: React.PointerEvent): Point {
    const rect = canvas.current!.getBoundingClientRect();
    return {
      x: Math.min(
        width,
        Math.max(0, ((e.clientX - rect.left) * width) / rect.width),
      ),
      y: Math.min(
        height,
        Math.max(0, ((e.clientY - rect.top) * height) / rect.height),
      ),
    };
  }
  const canDraw = () => enabled && !frozen.current && now() < timeLimitMs;
  return (
    <div className="space-y-3">
      <div className="study-tools">
        <label>
          颜色{' '}
          <input
            aria-label="画笔颜色"
            type="color"
            value={color}
            disabled={!enabled}
            onChange={(e) => {
              setColor(e.target.value);
              onEvent('parameter_changed', { source: 'manual' });
            }}
          />
        </label>
        <label>
          粗细{' '}
          <input
            aria-label="画笔粗细"
            type="range"
            min="1"
            max="80"
            value={brushWidth}
            disabled={!enabled}
            onChange={(e) => {
              setWidth(+e.target.value);
              onEvent('parameter_changed', { source: 'manual' });
            }}
          />
        </label>
        <select
          aria-label="绘画工具"
          value={tool}
          disabled={!enabled}
          onChange={(e) => {
            setTool(e.target.value);
            onEvent('tool_changed', { tool: e.target.value });
          }}
        >
          <option value="brush">画笔</option>
          <option value="eraser">橡皮</option>
        </select>
        <select
          aria-label="绘画图层"
          value={layer}
          disabled={!enabled}
          onChange={(e) => {
            setLayer(e.target.value as 'outline' | 'color');
            onEvent('layer_changed', { layer: e.target.value });
          }}
        >
          <option value="outline">轮廓层（上层）</option>
          <option value="color">颜色层（下层）</option>
        </select>
        <button
          disabled={!enabled}
          onClick={() => {
            if (!canDraw()) return;
            end();
            const m = marks.current.pop();
            if (m) {
              redo.current.push(m);
              draw(canvas.current!);
              onEvent('undo');
            }
          }}
        >
          撤销
        </button>
        <button
          disabled={!enabled}
          onClick={() => {
            if (!canDraw()) return;
            end();
            const m = redo.current.pop();
            if (m) {
              marks.current.push(m);
              draw(canvas.current!);
              onEvent('redo');
            }
          }}
        >
          重做
        </button>
      </div>
      {guide && (
        <div className="study-hint">
          <span>{PHASE_LABEL[guide.phase]} · 沿虚线从圆点画向箭头</span>
          <button
            disabled={!enabled}
            onClick={() => {
              if (!canDraw()) return;
              setColor(guide.color);
              setWidth(guide.width);
              setLayer(guide.phase === 'outline' ? 'outline' : 'color');
              setTool('brush');
              onEvent('parameter_changed', {
                source: 'recommendation',
                phase: guide.phase,
              });
            }}
          >
            应用本笔颜色、粗细与图层
          </button>
        </div>
      )}
      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl border-2 border-[#17233F] bg-white"
        style={{
          aspectRatio: `${width}/${height}`,
          maxHeight: '64vh',
          maxWidth: `min(100%, ${(64 * width) / height}vh)`,
        }}
      >
        <canvas
          ref={canvas}
          width={width}
          height={height}
          aria-label="绘画画布"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(e) => {
            if (!canDraw() || !e.isPrimary || e.button !== 0 || active.current)
              return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const id = crypto.randomUUID();
            active.current = {
              pointerId: e.pointerId,
              start: now(),
              id,
              mark: {
                points: [point(e)],
                color,
                width: brushWidth,
                tool,
                layer,
              },
            };
            onEvent('stroke_started', { strokeId: id, tool, layer });
            draw(canvas.current!);
          }}
          onPointerMove={(e) => {
            const a = active.current;
            if (!a || e.pointerId !== a.pointerId || !canDraw()) return;
            const p = point(e),
              last = a.mark.points.at(-1)!;
            if (Math.hypot(p.x - last.x, p.y - last.y) < 0.4) return;
            a.mark.points.push(p);
            draw(canvas.current!);
          }}
          onPointerUp={(e) => {
            if (active.current?.pointerId === e.pointerId) end();
          }}
          onPointerCancel={(e) => {
            if (active.current?.pointerId === e.pointerId) end(true);
          }}
          onLostPointerCapture={(e) => {
            if (active.current?.pointerId === e.pointerId) end(true);
          }}
        />
        {guide && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
          >
            <defs>
              <marker
                id="guide-arrow"
                markerWidth="7"
                markerHeight="7"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0 0L6 3L0 6" fill="none" stroke="#6558d9" />
              </marker>
            </defs>
            <polyline
              points={guide.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#6558d9"
              strokeWidth="2"
              strokeDasharray="4 3"
              markerEnd="url(#guide-arrow)"
            />
            <circle
              cx={guide.points[0].x}
              cy={guide.points[0].y}
              r="4"
              fill="#ffd166"
              stroke="#17233f"
            />
          </svg>
        )}
      </div>
    </div>
  );
});

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { StrokeDrawData } from '@/lib/stroke-engine';

interface WatchDemoProps {
  stroke: StrokeDrawData;
  canvasWidth: number;
  canvasHeight: number;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * 先看后做：在 Canvas 上演示当前笔触的路径
 * 一个小光点沿路径匀速移动 1.5 秒
 */
export default function WatchDemo({ stroke, canvasWidth, canvasHeight, onComplete, onSkip }: WatchDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stroke.points.length < 2) {
      onComplete();
      return;
    }

    const ctx = canvas.getContext('2d')!;
    const duration = 1500; // 1.5 秒
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      setProgress(t);

      // 清除
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 画已走过的轨迹（半透明）
      const pointIdx = Math.floor(t * (stroke.points.length - 1));
      const pts = stroke.points.slice(0, pointIdx + 1);

      if (pts.length >= 2) {
        ctx.strokeStyle = 'rgba(122, 81, 236, 0.3)';
        ctx.lineWidth = Math.max(2, stroke.width * 0.6);
        ctx.lineCap = 'round';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 画光点
      const currentPt = stroke.points[pointIdx];
      if (currentPt) {
        ctx.beginPath();
        ctx.arc(currentPt.x, currentPt.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#7A51EC';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(currentPt.x, currentPt.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(122, 81, 236, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setDone(true);
        // 自动完成延迟
        setTimeout(onComplete, 800);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [stroke, canvasWidth, canvasHeight, onComplete]);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* 演示 canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0"
      />

      {/* 提示文字 */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-auto">
        {!done ? (
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7A51EC' }}>
              看 Starry 画一遍...
            </span>
            <button
              onClick={onSkip}
              style={{ fontSize: '0.7rem', fontWeight: 600, color: '#BBB' }}
            >
              跳过
            </button>
          </div>
        ) : (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7A51EC' }}
          >
            你的回合！
          </motion.span>
        )}
      </div>
    </div>
  );
}

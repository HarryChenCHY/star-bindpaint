'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PaintCanvas, { PaintMode } from '@/components/PaintCanvas';
import ModeSelector from '@/components/ModeSelector';
import ToolBar from '@/components/ToolBar';
import StarrySprite, { SpriteState } from '@/components/StarrySprite';
import ProgressRing from '@/components/ProgressRing';
import { decomposeImage, imageSourceFromImage, StrokeDrawData, drawStroke, Vec2 } from '@/lib/stroke-engine';
import { matchScore } from '@/lib/drawing-engine';
import { GuideSystem } from '@/lib/guide-system';
import { saveToGallery } from '@/lib/gallery-store';

export default function PaintPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PaintMode>('follow');
  const [guideSubMode, setGuideSubMode] = useState<'assist' | 'real'>('assist');
  const [brushWidth, setBrushWidth] = useState(4);
  const [autoSpeed, setAutoSpeed] = useState(30);
  const [roughness, setRoughness] = useState(2);
  const [strokes, setStrokes] = useState<StrokeDrawData[]>([]);
  const [currentGuideStroke, setCurrentGuideStroke] = useState<StrokeDrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [spriteState, setSpriteState] = useState<SpriteState>('thinking');
  const [spriteMessage, setSpriteMessage] = useState('正在分析图片...');
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 400 });
  const guideRef = useRef<GuideSystem>(new GuideSystem());

  // 加载图片并分析
  useEffect(() => {
    const dataUrl = sessionStorage.getItem('star-bindpaint-source');
    if (!dataUrl) {
      router.push('/create');
      return;
    }

    // 读取用户选择的 roughness
    const savedRoughness = parseInt(sessionStorage.getItem('star-bindpaint-roughness') || '2');
    setRoughness(savedRoughness);

    const img = new Image();
    img.onload = async () => {
      setSourceImage(img);
      const w = parseInt(sessionStorage.getItem('star-bindpaint-source-w') || '400');
      const h = parseInt(sessionStorage.getItem('star-bindpaint-source-h') || '400');

      // 画布尺寸限制在合理范围
      const maxCanvas = 512;
      let cw = w, ch = h;
      if (Math.max(cw, ch) > maxCanvas) {
        const scale = maxCanvas / Math.max(cw, ch);
        cw = Math.round(cw * scale);
        ch = Math.round(ch * scale);
      }
      setCanvasSize({ w: cw, h: ch });

      setSpriteState('thinking');
      setSpriteMessage('正在拆解图片为笔触序列...');

      try {
        const imgSrc = imageSourceFromImage(img, 512);
        setLoadingMsg('ETF 方向场计算中...');
        const result = await decomposeImage(imgSrc, cw, ch, {
          roughness: roughness,
          lloydIter: 12,
        });

        setLoadingMsg(`生成了 ${result.length} 笔触，准备中...`);
        setStrokes(result);

        // 初始化引导系统
        guideRef.current.loadStrokes(result);
        const state = guideRef.current.getState();
        setCurrentGuideStroke(state.currentStroke);
        setSpriteState('guiding');
        setSpriteMessage(`共 ${result.length} 笔，跟着金色虚线画吧~`);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setSpriteMessage('分析出错了，请返回重试');
        setSpriteState('idle');
      }
    };
    img.src = dataUrl;
  }, [router]);

  // 监听引导系统状态变化
  useEffect(() => {
    const guide = guideRef.current;
    guide.setMode(guideSubMode);

    const unsubscribe = guide.subscribe((state) => {
      setCurrentGuideStroke(state.currentStroke);
      setProgress(state.totalStrokes > 0 ? state.currentIndex / state.totalStrokes : 0);
      setSpriteState(state.spriteState as SpriteState);
      setSpriteMessage(state.message);

      if (state.completed) {
        setProgress(1);
      }
    });

    return unsubscribe;
  }, [guideSubMode]);

  // 用户完成一笔
  const handleUserStrokeDone = useCallback((userPoints: Vec2[], score: number) => {
    if (mode === 'follow') {
      const guide = guideRef.current;
      const { passed, shouldReplace } = guide.submitStroke(score);

      if (passed && shouldReplace) {
        // 辅助模式：用 AI 笔触替换
        const paintCanvas = (window as unknown as Record<string, { drawAIStrokeOnBase: (s: StrokeDrawData) => void; clearUser: () => void }>).__paintCanvas;
        if (paintCanvas && currentGuideStroke) {
          paintCanvas.clearUser();
          paintCanvas.drawAIStrokeOnBase(currentGuideStroke);
        }
      } else if (passed && !shouldReplace) {
        // 真实模式：保留用户笔迹，把它移到 base 层
        // 这里简化处理，用户笔迹已在 user layer 上
      }
    } else if (mode === 'free') {
      guideRef.current.freeModeFeedback();
    }
  }, [mode, currentGuideStroke]);

  // 自动模式进度
  const handleAutoProgress = useCallback((current: number, total: number) => {
    setProgress(current / total);
  }, []);

  const handleAutoComplete = useCallback(() => {
    setSpriteState('cheering');
    setSpriteMessage('自动绘制完成！');
    setProgress(1);
  }, []);

  // 操作
  const handleReset = () => {
    const paintCanvas = (window as unknown as Record<string, { clearAll: () => void }>).__paintCanvas;
    if (paintCanvas) paintCanvas.clearAll();
    guideRef.current.reset();
    setProgress(0);
  };

  const handleSkip = () => {
    guideRef.current.skip();
  };

  // 批量自动画：AI自动绘制接下来 N 笔
  const handleBatchDraw = (count: number) => {
    const paintCanvas = (window as unknown as Record<string, {
      drawAIStrokeOnBase: (s: StrokeDrawData) => void;
      clearUser: () => void;
    }>).__paintCanvas;
    if (!paintCanvas) return;

    const guide = guideRef.current;
    for (let i = 0; i < count; i++) {
      const stroke = guide.getCurrentStroke();
      if (!stroke) break;
      paintCanvas.drawAIStrokeOnBase(stroke);
      guide.skip();
    }
  };

  const handleExport = () => {
    const paintCanvas = (window as unknown as Record<string, { getBaseCanvas: () => HTMLCanvasElement | null }>).__paintCanvas;
    if (!paintCanvas) return;
    const canvas = paintCanvas.getBaseCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    saveToGallery({
      imageDataUrl: dataUrl,
      title: `作品 ${new Date().toLocaleDateString('zh-CN')}`,
      strokeCount: strokes.length,
      mode: mode,
    });

    setSpriteMessage('作品已保存到画廊！');
    setSpriteState('cheering');

    // 也提供下载
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `星绘智愈_${Date.now()}.png`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <StarrySprite state={spriteState} message={spriteMessage} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full"
        />
        <p className="text-[#94A3B8] text-sm">{loadingMsg || 'AI 正在分析图片中的笔触...'}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08]">
        <button
          onClick={() => router.push('/')}
          className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          返回
        </button>

        <ModeSelector current={mode} onChange={setMode} />

        <button
          onClick={handleExport}
          className="px-4 py-1.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-sm font-medium hover:bg-[#10B981]/30 transition-colors"
        >
          保存
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <PaintCanvas
            width={canvasSize.w}
            height={canvasSize.h}
            mode={mode}
            strokes={strokes}
            currentGuideStroke={currentGuideStroke}
            guideSubMode={guideSubMode}
            brushWidth={brushWidth}
            autoSpeed={autoSpeed}
            onUserStrokeDone={handleUserStrokeDone}
            onAutoProgress={handleAutoProgress}
            onAutoComplete={handleAutoComplete}
            sourceImage={sourceImage}
          />
        </div>

        {/* Side panel */}
        <aside className="w-64 border-l border-white/[0.08] p-4 flex flex-col gap-5 overflow-y-auto">
          {/* Sprite */}
          <StarrySprite state={spriteState} message={spriteMessage} />

          {/* Progress */}
          <div className="flex justify-center">
            <ProgressRing
              progress={progress}
              label={`${Math.round(progress * strokes.length)} / ${strokes.length} 笔`}
            />
          </div>

          {/* Tools */}
          <ToolBar
            brushWidth={brushWidth}
            onBrushWidthChange={setBrushWidth}
            guideSubMode={guideSubMode}
            onGuideSubModeChange={setGuideSubMode}
            autoSpeed={autoSpeed}
            onAutoSpeedChange={setAutoSpeed}
            showSubMode={mode === 'follow'}
            showSpeed={mode === 'auto'}
            onReset={handleReset}
            onSkip={mode === 'follow' ? handleSkip : undefined}
            onBatchDraw={mode === 'follow' ? handleBatchDraw : undefined}
            onExport={handleExport}
            totalStrokes={strokes.length}
            currentStrokeIdx={Math.round(progress * strokes.length)}
          />
        </aside>
      </div>
    </div>
  );
}

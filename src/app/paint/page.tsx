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
import { getTracker } from '@/lib/painting-tracker';
import { MiniStar } from '@/components/Characters';

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

  useEffect(() => {
    const dataUrl = sessionStorage.getItem('star-bindpaint-source');
    if (!dataUrl) { router.push('/create'); return; }

    const savedRoughness = parseInt(sessionStorage.getItem('star-bindpaint-roughness') || '2');
    setRoughness(savedRoughness);

    const img = new Image();
    img.onload = async () => {
      setSourceImage(img);
      const w = parseInt(sessionStorage.getItem('star-bindpaint-source-w') || '400');
      const h = parseInt(sessionStorage.getItem('star-bindpaint-source-h') || '400');

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

        // 初始化数据采集器
        const tracker = getTracker();
        tracker.setMode(mode, guideSubMode);
        tracker.setRoughness(roughness);
        tracker.setCanvasSize(cw, ch);
        // 读取大师作品信息（如果有）
        const masterInfo = sessionStorage.getItem('star-bindpaint-master');
        if (masterInfo) {
          const { id, title, artist } = JSON.parse(masterInfo);
          tracker.setMasterwork(id, title, artist);
        } else {
          tracker.setCustomUpload();
        }
        const savedMood = sessionStorage.getItem('star-bindpaint-mood') || '';
        tracker.setMood(savedMood);
        tracker.startSession(result.length);

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

  useEffect(() => {
    const guide = guideRef.current;
    guide.setMode(guideSubMode);

    const unsubscribe = guide.subscribe((state) => {
      setCurrentGuideStroke(state.currentStroke);
      setProgress(state.totalStrokes > 0 ? state.currentIndex / state.totalStrokes : 0);
      setSpriteState(state.spriteState as SpriteState);
      setSpriteMessage(state.message);
      if (state.completed) setProgress(1);
    });

    return unsubscribe;
  }, [guideSubMode]);

  const handleUserStrokeDone = useCallback((userPoints: Vec2[], score: number) => {
    const tracker = getTracker();

    if (mode === 'follow') {
      const guide = guideRef.current;
      const guideState = guide.getState();

      // 记录笔触数据
      const region = currentGuideStroke?.points?.[Math.floor((currentGuideStroke?.points?.length || 0) / 2)]
        || { x: 0, y: 0 };
      const color = currentGuideStroke
        ? `rgba(${Math.round(currentGuideStroke.color[0]*255)},${Math.round(currentGuideStroke.color[1]*255)},${Math.round(currentGuideStroke.color[2]*255)},1)`
        : '';

      tracker.strokeCompleted(guideState.currentIndex, color, region, score);

      const { passed, shouldReplace } = guide.submitStroke(score);

      if (passed && shouldReplace) {
        const paintCanvas = (window as unknown as Record<string, { drawAIStrokeOnBase: (s: StrokeDrawData) => void; clearUser: () => void }>).__paintCanvas;
        if (paintCanvas && currentGuideStroke) {
          paintCanvas.clearUser();
          paintCanvas.drawAIStrokeOnBase(currentGuideStroke);
        }
      }
    } else if (mode === 'free') {
      // 自由模式也记录
      const center = userPoints.length > 0
        ? userPoints[Math.floor(userPoints.length / 2)]
        : { x: 0, y: 0 };
      tracker.strokeCompleted(tracker.getSession().strokes.length, '', center, score);
      guideRef.current.freeModeFeedback();
    }
  }, [mode, currentGuideStroke]);

  const handleAutoProgress = useCallback((current: number, total: number) => {
    setProgress(current / total);
  }, []);

  const handleAutoComplete = useCallback(() => {
    setSpriteState('cheering');
    setSpriteMessage('自动绘制完成！');
    setProgress(1);
  }, []);

  const handleReset = () => {
    const paintCanvas = (window as unknown as Record<string, { clearAll: () => void }>).__paintCanvas;
    if (paintCanvas) paintCanvas.clearAll();
    guideRef.current.reset();
    setProgress(0);
  };

  const handleSkip = () => {
    const tracker = getTracker();
    const guide = guideRef.current;
    const stroke = guide.getCurrentStroke();
    if (stroke && stroke.points.length > 0) {
      const mid = stroke.points[Math.floor(stroke.points.length / 2)];
      tracker.strokeSkipped(guide.getState().currentIndex, mid);
    }
    guide.skip();
  };

  const handleBatchDraw = (count: number) => {
    const paintCanvas = (window as unknown as Record<string, {
      drawAIStrokeOnBase: (s: StrokeDrawData) => void;
      clearUser: () => void;
    }>).__paintCanvas;
    if (!paintCanvas) return;

    const tracker = getTracker();
    const guide = guideRef.current;
    const startIdx = guide.getState().currentIndex;

    for (let i = 0; i < count; i++) {
      const stroke = guide.getCurrentStroke();
      if (!stroke) break;
      paintCanvas.drawAIStrokeOnBase(stroke);
      guide.skip();
    }

    tracker.strokesBatched(startIdx, count);
  };

  const handleExport = () => {
    const paintCanvas = (window as unknown as Record<string, { getBaseCanvas: () => HTMLCanvasElement | null }>).__paintCanvas;
    if (!paintCanvas) return;
    const canvas = paintCanvas.getBaseCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    // 完成数据采集 session
    const tracker = getTracker();
    tracker.finishSession(dataUrl);

    // 输出分析 prompt 到 console（后续接 LLM API 时改为网络请求）
    const prompt = tracker.buildAnalysisPrompt();
    console.log('[PaintingTracker] Session 完成，分析 prompt:');
    console.log(prompt);
    console.log('[PaintingTracker] Session 数据:', tracker.getSession());

    // 存到 sessionStorage 供后续 LLM 分析页面读取
    sessionStorage.setItem('star-bindpaint-session', JSON.stringify(tracker.getSession()));
    sessionStorage.setItem('star-bindpaint-prompt', prompt);

    saveToGallery({
      imageDataUrl: dataUrl,
      title: `作品 ${new Date().toLocaleDateString('zh-CN')}`,
      strokeCount: strokes.length,
      mode: mode,
    });

    setSpriteMessage('作品已保存！点击查看 Starry 的观察报告~');
    setSpriteState('cheering');

    // 跳转到报告页面（延迟让用户看到反馈）
    setTimeout(() => {
      router.push('/report');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-white">
        <StarrySprite state={spriteState} message={spriteMessage} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full"
          style={{ border: '3px solid #E5E5E5', borderTopColor: '#7A51EC' }}
        />
        <p style={{ fontSize: '0.85rem', color: '#888888', fontWeight: 700 }}>
          {loadingMsg || 'AI 正在分析图片中的笔触...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm font-bold transition-colors"
          style={{ color: '#1A1A1A' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          返回
        </button>

        <div className="flex items-center gap-2">
          <MiniStar color="#F9B801" size={16} />
          <ModeSelector current={mode} onChange={setMode} />
        </div>

        <button
          onClick={handleExport}
          className="btn-black"
          style={{ padding: '0.4em 1.2em', fontSize: '0.85rem' }}
        >
          保存
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-6"
          style={{ background: '#FAFAFA' }}>
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
            onUserStrokeStart={() => getTracker().strokeStart()}
            onAutoProgress={handleAutoProgress}
            onAutoComplete={handleAutoComplete}
            sourceImage={sourceImage}
          />
        </div>

        {/* Side panel */}
        <aside className="w-64 flex flex-col gap-4 overflow-y-auto p-5 bg-white"
          style={{ borderLeft: '2px solid #1A1A1A' }}>
          {/* Sprite */}
          <StarrySprite state={spriteState} message={spriteMessage} />

          {/* Progress */}
          <div className="flex justify-center py-1">
            <ProgressRing
              progress={progress}
              label={`${Math.round(progress * strokes.length)} / ${strokes.length} 笔`}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 2, background: '#E5E5E5' }} />

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

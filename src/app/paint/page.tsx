'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PaintCanvas, { PaintMode } from '@/components/PaintCanvas';
import ModeSelector from '@/components/ModeSelector';
import ToolBar from '@/components/ToolBar';
import StarrySprite, { SpriteState } from '@/components/StarrySprite';
import ProgressRing from '@/components/ProgressRing';
import EmotionPicker, { Emotion } from '@/components/EmotionPicker';
import VisualSchedule from '@/components/VisualSchedule';
import CalmBreathing from '@/components/CalmBreathing';
import SharedAttention from '@/components/SharedAttention';
import FreeModeThemes, { FreeTheme, ThemeStepGuide } from '@/components/FreeModeThemes';
import CaregiverTips from '@/components/CaregiverTips';
import SDRenderResult from '@/components/SDRenderResult';
import { decomposeImage, imageSourceFromImage, StrokeDrawData, drawStroke, Vec2 } from '@/lib/stroke-engine';
import { matchScore } from '@/lib/drawing-engine';
import { GuideSystem } from '@/lib/guide-system';
import { saveToGallery } from '@/lib/gallery-store';
import { getTracker } from '@/lib/painting-tracker';
import { EmotionDetector, EmotionLevel } from '@/lib/emotion-detector';
import { generateAttentionQuestion, generateCalmPrompt } from '@/lib/feedback-engine';
import { MASTER_STYLES, MasterStyleProfile } from '@/lib/style-transfer';
import { useAppSettings } from '@/contexts/AppContext';
import { MiniStar } from '@/components/Characters';

export default function PaintPage() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [mode, setMode] = useState<PaintMode>('follow');
  const [guideSubMode, setGuideSubMode] = useState<'assist' | 'real'>('assist');
  const [brushWidth, setBrushWidth] = useState(4);
  const [autoSpeed, setAutoSpeed] = useState(30);
  const [roughness, setRoughness] = useState(2);
  const [autoFillRatio, setAutoFillRatio] = useState(100);
  const [fillMode, setFillMode] = useState<'companion' | 'precise'>('companion');
  const [strokes, setStrokes] = useState<StrokeDrawData[]>([]);
  const [currentGuideStroke, setCurrentGuideStroke] = useState<StrokeDrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [spriteState, setSpriteState] = useState<SpriteState>('thinking');
  const [spriteMessage, setSpriteMessage] = useState('正在分析图片...');
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 400 });

  // 情绪后测
  const [showPostEmotion, setShowPostEmotion] = useState(false);
  const [postEmotion, setPostEmotion] = useState<string>('');
  const [savedDataUrl, setSavedDataUrl] = useState<string>('');

  // ASD 集成状态
  const [showCalm, setShowCalm] = useState(false);
  const [showAttention, setShowAttention] = useState(false);
  const [attentionQ, setAttentionQ] = useState<{ question: string; options: { label: string; correct: boolean }[] } | null>(null);
  const [freeTheme, setFreeTheme] = useState<FreeTheme | null>(null);
  const [freeThemeStep, setFreeThemeStep] = useState(0);
  const [showFreeThemes, setShowFreeThemes] = useState(true); // 自由模式初始显示主题选择
  const [caregiverState, setCaregiverState] = useState<'painting' | 'stuck' | 'completed' | 'resting'>('painting');
  const [userStrokeCount, setUserStrokeCount] = useState(0);

  // 自由创作风格化
  const [selectedStyle, setSelectedStyle] = useState<MasterStyleProfile | null>(null);
  const [freeColor, setFreeColor] = useState<[number, number, number]>([0.1, 0.3, 0.7]);

  // SD 渲染
  const [sdRendering, setSdRendering] = useState(false);
  const [sdResult, setSdResult] = useState<{ original: string; rendered: string; duration: number } | null>(null);

  const guideRef = useRef<GuideSystem>(new GuideSystem());
  const emotionDetectorRef = useRef<EmotionDetector | null>(null);
  const attentionIntervalRef = useRef(3); // 每 N 笔问一次（用户画3笔问1次）

  // 初始化情绪检测器
  useEffect(() => {
    const detector = new EmotionDetector((level: EmotionLevel) => {
      if (level === 'moderate' || level === 'severe') {
        setShowCalm(true);
        setCaregiverState('stuck');
        const tracker = getTracker();
        tracker.recordCalmTriggered();
      } else if (level === 'mild') {
        setSpriteMessage(generateCalmPrompt('mild'));
      }
    });
    emotionDetectorRef.current = detector;
    return () => { emotionDetectorRef.current = null; };
  }, []);

  // 空闲检测定时器（仅跟画模式，自由模式不检测）
  useEffect(() => {
    if (loading || showCalm || showPostEmotion || mode === 'free') return;
    const interval = setInterval(() => {
      const detector = emotionDetectorRef.current;
      if (detector) {
        const level = detector.checkIdle();
        if (level === 'moderate' || level === 'severe') {
          setShowCalm(true);
          setCaregiverState('stuck');
          getTracker().recordCalmTriggered();
        }
      }
    }, 15000); // 每 15 秒检查一次（而非 5 秒）
    return () => clearInterval(interval);
  }, [loading, showCalm, showPostEmotion, mode]);

  useEffect(() => {
    // 检查是否是自由创作模式（无需源图片）
    const freeStyleId = sessionStorage.getItem('star-bindpaint-free-style');
    if (freeStyleId) {
      const style = MASTER_STYLES.find(s => s.id === freeStyleId) || MASTER_STYLES[1]; // 默认梵高
      setSelectedStyle(style);
      setMode('free');
      setCanvasSize({ w: 512, h: 512 });
      setStrokes([]);
      setLoading(false);
      setSpriteState('guiding');
      setSpriteMessage(`自由创作 · ${style.name}风格 — 画出你想画的！`);

      const tracker = getTracker();
      tracker.setMode('free', 'assist');
      tracker.setCanvasSize(512, 512);
      tracker.setCustomUpload();
      tracker.startSession(0);
      return;
    }

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
        const savedMoodForEngine = sessionStorage.getItem('star-bindpaint-mood') || 'original';
        const result = await decomposeImage(imgSrc, cw, ch, {
          roughness: roughness,
          lloydIter: 12,
          mood: savedMoodForEngine,
        });

        setLoadingMsg(`生成了 ${result.length} 笔触，准备中...`);
        setStrokes(result);

        // 初始化数据采集器
        const tracker = getTracker();
        tracker.setMode(mode, guideSubMode);
        tracker.setRoughness(roughness);
        tracker.setCanvasSize(cw, ch);
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
        setSpriteMessage(`共 ${result.length} 笔，跟着引导线画吧~`);
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
      const prog = state.totalStrokes > 0 ? state.currentIndex / state.totalStrokes : 0;
      setProgress(prog);
      setSpriteState(state.spriteState as SpriteState);

      // 给用户有意义的进度引导（不只是默认消息）
      if (mode === 'follow' && !state.completed) {
        const percent = Math.round(prog * 100);
        if (percent < 10) {
          setSpriteMessage('从底色开始~ 一步步来就好');
        } else if (percent < 25) {
          setSpriteMessage('背景慢慢出来了，继续加油~');
        } else if (percent < 50) {
          setSpriteMessage('快一半了！画面越来越完整了');
        } else if (percent < 75) {
          setSpriteMessage('过半了！细节部分开始出现了~');
        } else if (percent < 95) {
          setSpriteMessage('快完成了！最后一点点~');
        } else {
          setSpriteMessage('几乎完成了！再画几笔就好');
        }
      } else {
        setSpriteMessage(state.message);
      }

      if (state.completed) {
        setProgress(1);
        setCaregiverState('completed');
      }
    });

    return unsubscribe;
  }, [guideSubMode]);

  const handleUserStrokeDone = useCallback((userPoints: Vec2[], score: number) => {
    const tracker = getTracker();
    const detector = emotionDetectorRef.current;

    if (mode === 'follow') {
      const guide = guideRef.current;
      const guideState = guide.getState();

      const region = currentGuideStroke?.points?.[Math.floor((currentGuideStroke?.points?.length || 0) / 2)]
        || { x: 0, y: 0 };
      const color = currentGuideStroke
        ? `rgba(${Math.round(currentGuideStroke.color[0]*255)},${Math.round(currentGuideStroke.color[1]*255)},${Math.round(currentGuideStroke.color[2]*255)},1)`
        : '';

      tracker.strokeCompleted(guideState.currentIndex, color, region, score);

      const { passed, shouldReplace } = guide.submitStroke(score);

      // 情绪检测
      if (passed) {
        detector?.reportSuccess();
      } else {
        detector?.reportFailure();
      }

      if (passed && shouldReplace) {
        const paintCanvas = (window as unknown as Record<string, { drawAIStrokeOnBase: (s: StrokeDrawData) => void; clearUser: () => void }>).__paintCanvas;
        if (paintCanvas && currentGuideStroke) {
          paintCanvas.clearUser();
          paintCanvas.drawAIStrokeOnBase(currentGuideStroke);
        }

        // 更新用户手绘笔数
        setUserStrokeCount(prev => {
          const newCount = prev + 1;
          // 共同注意：每 N 笔弹出一个问题
          if (newCount % attentionIntervalRef.current === 0 && fillMode === 'companion' && currentGuideStroke) {
            const q = generateAttentionQuestion(
              currentGuideStroke.color,
              region,
              { w: canvasSize.w, h: canvasSize.h }
            );
            setAttentionQ(q);
            setShowAttention(true);
          }
          return newCount;
        });

        // 陪画模式：用户画完1笔后，AI 一次性画 N 笔（不逐笔动画）
        if (fillMode === 'companion' && autoFillRatio > 0 && paintCanvas) {
          setTimeout(() => {
            let drawn = 0;
            for (let i = 0; i < autoFillRatio; i++) {
              const nextStroke = guide.getCurrentStroke();
              if (!nextStroke) break;
              paintCanvas.drawAIStrokeOnBase(nextStroke);
              guide.skip();
              drawn++;
            }
            if (drawn > 0) {
              tracker.strokesBatched(guideState.currentIndex + 1, drawn);
            }
          }, 300);
        }
      }
    } else if (mode === 'free') {
      const center = userPoints.length > 0
        ? userPoints[Math.floor(userPoints.length / 2)]
        : { x: 0, y: 0 };
      tracker.strokeCompleted(tracker.getSession().strokes.length, '', center, score);
      guideRef.current.freeModeFeedback();
      detector?.reportSuccess();
    }
  }, [mode, currentGuideStroke, fillMode, autoFillRatio, canvasSize]);

  const handleAutoProgress = useCallback((current: number, total: number) => {
    setProgress(current / total);
  }, []);

  const handleAutoComplete = useCallback(() => {
    setSpriteState('cheering');
    setSpriteMessage('自动绘制完成！');
    setProgress(1);
    setCaregiverState('completed');
  }, []);

  const handleReset = () => {
    const paintCanvas = (window as unknown as Record<string, { clearAll: () => void }>).__paintCanvas;
    if (paintCanvas) paintCanvas.clearAll();
    guideRef.current.reset();
    setProgress(0);
    setUserStrokeCount(0);
    emotionDetectorRef.current?.reset();
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
    emotionDetectorRef.current?.reportSkip();
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

  // ── 共同注意回答 ──
  const handleAttentionAnswer = (option: { label: string; correct: boolean }) => {
    const tracker = getTracker();
    tracker.recordSharedAttention(attentionQ?.question || '', option.label, option.correct);
    setShowAttention(false);

    // 根据问题类型给有意义的反馈（不只是"答对了"）
    const question = attentionQ?.question || '';
    let feedback = '';

    if (question.includes('什么颜色')) {
      if (option.correct) {
        feedback = `对！这是${option.label}~ 你的眼睛真厉害`;
      } else {
        feedback = `这个其实是${attentionQ?.options.find(o => o.correct)?.label}哦，没关系~`;
      }
    } else if (question.includes('画在哪里')) {
      if (option.correct) {
        feedback = `没错！就是在${option.label}~ 你观察得很仔细`;
      } else {
        feedback = `是在${attentionQ?.options.find(o => o.correct)?.label}哦，继续看~`;
      }
    } else if (question.includes('想到什么感觉')) {
      // 情感联想题没有对错，给肯定
      const colorName = question.replace('让你想到什么感觉？', '');
      const colorMeaning: Record<string, string> = {
        '红色': '在梵高的画里，红色常常代表热烈的生命力',
        '蓝色': '莫奈最爱用蓝色画水面，代表宁静和深远',
        '绿色': '高更用绿色画大自然，代表生命和自由',
        '黄色': '梵高的向日葵就是金黄色的，代表温暖和希望',
        '紫色': '莫奈的睡莲里有很多紫色，神秘又美丽',
        '橙色': '伦勃朗喜欢用橙色画烛光，温暖又亲切',
      };
      feedback = colorMeaning[colorName] || `每种颜色都有自己的故事~`;
    } else {
      feedback = '继续画吧~';
    }

    setSpriteMessage(feedback);
    setSpriteState('guiding');
    setAttentionQ(null);
    setTimeout(() => {
      setSpriteState('guiding');
    }, 3000);
  };

  // ── 保存 & 情绪后测 ──
  const handleExport = () => {
    const paintCanvas = (window as unknown as Record<string, { getBaseCanvas: () => HTMLCanvasElement | null }>).__paintCanvas;
    if (!paintCanvas) return;
    const canvas = paintCanvas.getBaseCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setSavedDataUrl(dataUrl);
    setShowPostEmotion(true);
    setSpriteMessage('画完啦！告诉我现在感觉怎么样？');
    setSpriteState('cheering');
  };

  const handlePostEmotionConfirm = () => {
    const dataUrl = savedDataUrl;
    if (!dataUrl) return;

    const tracker = getTracker();
    if (postEmotion) {
      tracker.setEmotionAfter(postEmotion);
    }
    const emotionBefore = sessionStorage.getItem('star-bindpaint-emotion-before') || '';
    if (emotionBefore) {
      tracker.setEmotionBefore(emotionBefore);
    }

    tracker.finishSession(dataUrl);
    const prompt = tracker.buildAnalysisPrompt();

    sessionStorage.setItem('star-bindpaint-session', JSON.stringify(tracker.getSession()));
    sessionStorage.setItem('star-bindpaint-prompt', prompt);
    sessionStorage.setItem('star-bindpaint-emotion-after', postEmotion);

    saveToGallery({
      imageDataUrl: dataUrl,
      title: `作品 ${new Date().toLocaleDateString('zh-CN')}`,
      strokeCount: strokes.length,
      mode: mode,
    });

    setSpriteMessage('作品已保存！正在生成观察报告...');
    setShowPostEmotion(false);

    setTimeout(() => {
      router.push('/report');
    }, 1000);
  };

  // ── 呼吸引导返回 ──
  const handleCalmReturn = () => {
    setShowCalm(false);
    setCaregiverState('painting');
    emotionDetectorRef.current?.reset();
    setSpriteMessage('欢迎回来~继续画吧');
    setSpriteState('guiding');
  };

  // ── SD 渲染（变成油画）──
  const handleSDRender = async () => {
    const paintCanvas = (window as unknown as Record<string, { getBaseCanvas: () => HTMLCanvasElement | null }>).__paintCanvas;
    if (!paintCanvas) return;
    const canvas = paintCanvas.getBaseCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const styleId = selectedStyle?.id || 'vangogh';
    const themePrompt = freeTheme?.sdPrompt || '';

    setSdRendering(true);
    setSpriteMessage('✨ Starry 正在施魔法...');
    setSpriteState('thinking');

    try {
      const res = await fetch('/api/sd-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, style: styleId, mode: 'stylization', themePrompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '渲染失败');
      }

      const data = await res.json();
      setSdResult({ original: dataUrl, rendered: data.imageBase64, duration: data.duration });
      setSpriteMessage('魔法完成！看看你的画变成了什么~');
      setSpriteState('cheering');
    } catch (err) {
      setSpriteMessage(`渲染失败：${err instanceof Error ? err.message : '未知错误'}`);
      setSpriteState('idle');
    } finally {
      setSdRendering(false);
    }
  };

  const handleSDSave = (imageBase64: string) => {
    try {
      saveToGallery({
        imageDataUrl: imageBase64,
        title: `油画版 ${new Date().toLocaleDateString('zh-CN')}`,
        strokeCount: 0,
        mode: 'free',
      });
      setSpriteMessage('油画版已放进画廊！');
      setSpriteState('cheering');
    } catch (err) {
      setSpriteMessage('保存失败，图片可能太大了');
    }
    setSdResult(null);
  };

  // SD 渲染后 → 保存油画版 + 进入心理分析流程（用原始简笔画做分析）
  const handleSDFinish = (oilImageBase64: string) => {
    // 保存油画版到画廊
    try {
      saveToGallery({
        imageDataUrl: oilImageBase64,
        title: `油画版 ${new Date().toLocaleDateString('zh-CN')}`,
        strokeCount: 0,
        mode: 'free',
      });
    } catch {}

    setSdResult(null);

    // 用原始简笔画（不是油画版）做心理分析 — 简笔画才反映内心
    const paintCanvas = (window as unknown as Record<string, { getBaseCanvas: () => HTMLCanvasElement | null }>).__paintCanvas;
    if (paintCanvas) {
      const canvas = paintCanvas.getBaseCanvas();
      if (canvas) {
        const sketchDataUrl = canvas.toDataURL('image/png');
        setSavedDataUrl(sketchDataUrl);
      }
    }

    // 触发情绪后测
    setShowPostEmotion(true);
    setSpriteMessage('画完啦！告诉我现在感觉怎么样？');
    setSpriteState('cheering');
  };

  // ── Loading ──
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
    <div className="flex-1 flex flex-col h-screen bg-white" data-calm={settings.calmMode}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#F5F5F5', border: '2px solid #E5E5E5' }}
          title="回去"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <MiniStar color="#F9B801" size={16} />
          <ModeSelector current={mode} onChange={setMode} />
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 transition-colors"
          style={{ background: '#1A1A1A', border: '2px solid #1A1A1A' }}
          title="放进画廊"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
            <path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>完成</span>
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Visual Schedule（左侧进度条） */}
        {mode === 'follow' && (
          <div className="hidden md:flex" style={{ borderRight: '1px solid #E5E5E5', background: '#FAFAFA' }}>
            <VisualSchedule
              currentStep={Math.round(progress * strokes.length)}
              totalSteps={strokes.length}
              calmMode={settings.calmMode}
            />
          </div>
        )}

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-6 relative"
          style={{ background: '#FAFAFA', pointerEvents: (sdResult || showPostEmotion || showCalm) ? 'none' : 'auto' }}>

          {/* 自由模式主题选择 */}
          {mode === 'free' && showFreeThemes && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(250,250,250,0.95)' }}>
              <FreeModeThemes
                onSelect={(theme) => {
                  setFreeTheme(theme);
                  setFreeThemeStep(0);
                  setShowFreeThemes(false);
                  setSpriteMessage(theme.steps[0]?.hint || '开始画吧~');
                }}
                onSkip={() => setShowFreeThemes(false)}
              />
            </div>
          )}

          {/* 自由模式分步引导 */}
          {mode === 'free' && freeTheme && !showFreeThemes && (
            <ThemeStepGuide
              theme={freeTheme}
              currentStep={freeThemeStep}
              onNextStep={() => {
                if (freeThemeStep < freeTheme.steps.length - 1) {
                  const next = freeThemeStep + 1;
                  setFreeThemeStep(next);
                  setSpriteMessage(freeTheme.steps[next].hint);
                } else {
                  setSpriteMessage('全部画完了！试试点 ✨变成油画 看看效果~');
                  setSpriteState('cheering');
                }
              }}
            />
          )}

          <PaintCanvas
            width={canvasSize.w}
            height={canvasSize.h}
            mode={mode}
            strokes={strokes}
            currentGuideStroke={currentGuideStroke}
            guideSubMode={guideSubMode}
            brushWidth={brushWidth}
            autoSpeed={autoSpeed}
            masterStyle={selectedStyle}
            freeColor={freeColor}
            onUserStrokeDone={handleUserStrokeDone}
            onUserStrokeStart={() => {
              getTracker().strokeStart();
              emotionDetectorRef.current?.reportPointerDown();
            }}
            onAutoProgress={handleAutoProgress}
            onAutoComplete={handleAutoComplete}
            sourceImage={sourceImage}
          />

          {/* 共同注意弹窗 */}
          <AnimatePresence>
            {showAttention && attentionQ && (
              <SharedAttention
                question={attentionQ.question}
                options={attentionQ.options}
                onAnswer={handleAttentionAnswer}
              />
            )}
          </AnimatePresence>
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

          {/* 自由创作风格选择器 */}
          {mode === 'free' && (
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                大师风格
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {MASTER_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                    style={{
                      border: selectedStyle?.id === s.id ? `2px solid ${s.color}` : '1.5px solid #E5E5E5',
                      background: selectedStyle?.id === s.id ? `${s.color}15` : 'white',
                    }}
                  >
                    <div className="w-6 h-6 rounded-full" style={{ background: s.color }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#1A1A1A' }}>{s.name}</span>
                  </button>
                ))}
              </div>
              {selectedStyle && (
                <p style={{ fontSize: '0.65rem', color: '#AAA', fontWeight: 600, marginTop: 6 }}>
                  {selectedStyle.description}
                </p>
              )}

              {/* 调色板 */}
              <label style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 700, display: 'block', marginTop: '12px', marginBottom: '0.4rem' }}>
                画笔颜色
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { color: [0.9, 0.2, 0.2] as [number, number, number], label: '红' },
                  { color: [0.95, 0.6, 0.1] as [number, number, number], label: '橙' },
                  { color: [0.95, 0.85, 0.1] as [number, number, number], label: '黄' },
                  { color: [0.2, 0.7, 0.3] as [number, number, number], label: '绿' },
                  { color: [0.1, 0.3, 0.7] as [number, number, number], label: '蓝' },
                  { color: [0.5, 0.2, 0.8] as [number, number, number], label: '紫' },
                  { color: [0.85, 0.4, 0.6] as [number, number, number], label: '粉' },
                  { color: [0.1, 0.1, 0.1] as [number, number, number], label: '黑' },
                  { color: [0.95, 0.93, 0.88] as [number, number, number], label: '白' },
                ].map(c => (
                  <button
                    key={c.label}
                    onClick={() => setFreeColor(c.color)}
                    className="w-7 h-7 rounded-full transition-all"
                    title={c.label}
                    style={{
                      background: `rgb(${Math.round(c.color[0]*255)},${Math.round(c.color[1]*255)},${Math.round(c.color[2]*255)})`,
                      border: freeColor[0] === c.color[0] && freeColor[1] === c.color[1] && freeColor[2] === c.color[2]
                        ? '3px solid #1A1A1A'
                        : '2px solid #E5E5E5',
                      transform: freeColor[0] === c.color[0] && freeColor[1] === c.color[1] && freeColor[2] === c.color[2]
                        ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              {/* ✨ 变成油画 按钮 */}
              <button
                onClick={handleSDRender}
                disabled={sdRendering}
                className="w-full mt-3 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: sdRendering ? '#E5E5E5' : 'linear-gradient(135deg, #7A51EC, #F302C9)',
                  color: 'white',
                  border: 'none',
                  opacity: sdRendering ? 0.6 : 1,
                }}
              >
                {sdRendering ? (
                  <>
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⏳</motion.span>
                    施魔法中...
                  </>
                ) : (
                  <>✨ 变成油画</>
                )}
              </button>

              <div style={{ height: 2, background: '#E5E5E5', margin: '12px 0' }} />
            </div>
          )}

          {/* Tools */}
          <ToolBar
            brushWidth={brushWidth}
            onBrushWidthChange={setBrushWidth}
            guideSubMode={guideSubMode}
            onGuideSubModeChange={setGuideSubMode}
            autoSpeed={autoSpeed}
            onAutoSpeedChange={setAutoSpeed}
            fillMode={fillMode}
            onFillModeChange={setFillMode}
            autoFillRatio={autoFillRatio}
            onAutoFillRatioChange={setAutoFillRatio}
            showSubMode={mode === 'follow'}
            showSpeed={mode === 'auto'}
            showFillMode={mode === 'follow'}
            onReset={handleReset}
            onSkip={mode === 'follow' ? handleSkip : undefined}
            onBatchDraw={mode === 'follow' ? handleBatchDraw : undefined}
            onExport={handleExport}
            totalStrokes={strokes.length}
            currentStrokeIdx={Math.round(progress * strokes.length)}
          />
        </aside>
      </div>

      {/* ═══ 照护者陪伴提示 ═══ */}
      <CaregiverTips currentState={caregiverState} mode={mode} />

      {/* ═══ 平静呼吸引导 ═══ */}
      <AnimatePresence>
        {showCalm && (
          <CalmBreathing onReturn={handleCalmReturn} />
        )}
      </AnimatePresence>

      {/* ═══ SD 渲染结果 ═══ */}
      <AnimatePresence>
        {sdResult && (
          <SDRenderResult
            originalImage={sdResult.original}
            renderedImage={sdResult.rendered}
            style={selectedStyle?.name || '梵高'}
            duration={sdResult.duration}
            onClose={() => setSdResult(null)}
            onSave={handleSDSave}
            onFinish={handleSDFinish}
          />
        )}
      </AnimatePresence>

      {/* ═══ 情绪后测弹窗 ═══ */}
      {showPostEmotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl"
            style={{ border: '2px solid #1A1A1A' }}
          >
            {savedDataUrl && (
              <div className="flex justify-center mb-5">
                <img src={savedDataUrl} alt="你的作品" className="w-32 h-32 rounded-2xl object-cover" style={{ border: '2px solid #E5E5E5' }} />
              </div>
            )}

            <h3 className="text-center mb-2" style={{ fontWeight: 900, fontSize: '1.3rem', color: '#1A1A1A' }}>
              画完啦！
            </h3>
            <p className="text-center mb-6" style={{ fontSize: '0.9rem', color: '#888', fontWeight: 600 }}>
              现在感觉怎么样？
            </p>

            <EmotionPicker
              selected={postEmotion}
              onSelect={(e: Emotion) => setPostEmotion(e)}
            />

            <div className="flex flex-col items-center mt-6 gap-3">
              <button
                onClick={handlePostEmotionConfirm}
                className="btn-black w-full"
                style={{ fontSize: '1rem', padding: '0.9em 2em' }}
              >
                {postEmotion ? '查看观察报告 →' : '跳过，直接查看报告'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ImagePlus } from 'lucide-react';
import PaintCanvas, { PaintMode } from '@/components/PaintCanvas';
import PaintBottomBar from '@/components/PaintBottomBar';
import StarrySprite, { SpriteState } from '@/components/StarrySprite';
import ProgressRing from '@/components/ProgressRing';
import EmotionPicker, { Emotion } from '@/components/EmotionPicker';
import VisualSchedule from '@/components/VisualSchedule';
import CalmBreathing from '@/components/CalmBreathing';
import SharedAttention from '@/components/SharedAttention';
import FreeModeThemes, { FreeTheme, ThemeStepGuide } from '@/components/FreeModeThemes';
import CaregiverTips from '@/components/CaregiverTips';
import SDRenderResult from '@/components/SDRenderResult';
import SDRenderLoading from '@/components/SDRenderLoading';
import StickerPanel, { StickerDef } from '@/components/StickerPanel';
import StickerItem, { PlacedSticker } from '@/components/StickerItem';
import TracingItem, { TracingRef } from '@/components/TracingItem';
import { decomposeImage, imageSourceFromImage, StrokeDrawData, drawStroke, Vec2 } from '@/lib/stroke-engine';
import { matchScore } from '@/lib/drawing-engine';
import { GuideSystem } from '@/lib/guide-system';
import { saveToGallery, uploadAndSaveToGallery } from '@/lib/gallery-store';
import { getTracker } from '@/lib/painting-tracker';
import { EmotionDetector, EmotionLevel } from '@/lib/emotion-detector';
import { generateAttentionQuestion, generateCalmPrompt, generateSDRenderCommentary } from '@/lib/feedback-engine';
import { MASTER_STYLES, MasterStyleProfile } from '@/lib/style-transfer';
import { createThemeTracingRef, THEME_TRACING_SCENES } from '@/lib/tracing-scenes';
import { drawStickerOnCanvas, loadStickerDimensions } from '@/lib/sticker-utils';
import { useAppSettings } from '@/contexts/AppContext';

export default function PaintPage() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [mode, setMode] = useState<PaintMode>('follow');
  const [guideSubMode, setGuideSubMode] = useState<'assist' | 'real'>('assist');
  const [brushWidth, setBrushWidth] = useState(4);
  const [autoSpeed, setAutoSpeed] = useState(200);
  const [autoStartIdx, setAutoStartIdx] = useState(0);
  const [roughness, setRoughness] = useState(2);
  const [autoFillRatio, setAutoFillRatio] = useState(200);
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
  const [promptCardCollapsed, setPromptCardCollapsed] = useState(false);

  // 自由创作风格化
  const [selectedStyle, setSelectedStyle] = useState<MasterStyleProfile | null>(null);
  const [freeColor, setFreeColor] = useState<[number, number, number]>([0.1, 0.3, 0.7]);
  const [freeSat, setFreeSat] = useState(1.0);
  const [freeVal, setFreeVal] = useState(1.0);

  // 撤销 & 橡皮擦 & 喷雾
  const [eraserMode, setEraserMode] = useState(false);
  const [sprayMode, setSprayMode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const handleToggleSpray = useCallback(() => {
    setSprayMode(prev => !prev);
    if (!sprayMode) setEraserMode(false); // 喷雾和橡皮擦互斥
  }, [sprayMode]);

  const handleUndo = useCallback(() => {
    const pc = (window as unknown as Record<string, { undo: () => boolean }>).__paintCanvas;
    if (pc) {
      const ok = pc.undo();
      if (!ok) setCanUndo(false);
    }
  }, []);

  // 难度模式（贴纸/描画/自由）
  const [difficultyLevel, setDifficultyLevel] = useState<'sticker' | 'tracing' | 'free'>('free');
  const [showPanel, setShowPanel] = useState(true);
  const [stickerGuideVisible, setStickerGuideVisible] = useState(false);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [tracingRefs, setTracingRefs] = useState<TracingRef[]>([]);
  const stickerIdRef = useRef(0);
  const lastFixedCanvasRef = useRef<ImageData | null>(null);

  // SD 渲染
  const [sdRendering, setSdRendering] = useState(false);
  const [sdResult, setSdResult] = useState<{ original: string; rendered: string; duration: number } | null>(null);
  const [sdError, setSdError] = useState<string | null>(null);
  const [sdElapsed, setSdElapsed] = useState(0);
  const [sdCommentary, setSdCommentary] = useState<string[]>([]);
  const sdStartTimeRef = useRef(0);
  const sdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyticsSentRef = useRef(false); // 防止同一次 session 重复上报

  type BackTarget = 'themes' | 'create';
  const [leaveConfirm, setLeaveConfirm] = useState<{ target: BackTarget } | null>(null);

  // 组件卸载时清理 SD 计时器
  useEffect(() => {
    return () => {
      if (sdTimerRef.current) clearInterval(sdTimerRef.current);
    };
  }, []);

  const guideRef = useRef<GuideSystem>(new GuideSystem());
  const emotionDetectorRef = useRef<EmotionDetector | null>(null);
  const attentionIntervalRef = useRef(3); // 每 N 笔问一次（用户画3笔问1次）
  const batchingRef = useRef(false); // 批量绘制中，抑制引导线更新

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
    }, 30000); // 每 30 秒检查一次（呼吸引导冷却 5 分钟，无需高频轮询）
    return () => clearInterval(interval);
  }, [loading, showCalm, showPostEmotion, mode]);

  useEffect(() => {
    // 检查是否是自由创作模式（无需源图片）
    const freeStyleId = sessionStorage.getItem('star-bindpaint-free-style');
    if (freeStyleId) {
      const style = MASTER_STYLES.find(s => s.id === freeStyleId) || MASTER_STYLES[1]; // 默认梵高
      setSelectedStyle(style);
      setMode('free');
      setCanvasSize({ w: 768, h: 768 });
      setStrokes([]);
      setLoading(false);
      setSpriteState('guiding');
      const diff = (sessionStorage.getItem('star-bindpaint-difficulty') as 'sticker' | 'tracing' | 'free') || 'free';
      setDifficultyLevel(diff);
      setShowPanel(diff === 'sticker');
      setShowFreeThemes(true);

      const tracker = getTracker();
      tracker.setDifficulty(diff);
      tracker.setStyleId(style.id);
      tracker.setMode('free', 'assist');
      tracker.setCanvasSize(768, 768);
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

      const maxCanvas = 768;
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
      // 批量绘制期间不更新引导线（防止闪烁）
      if (!batchingRef.current) {
        setCurrentGuideStroke(state.currentStroke);
      }
      const prog = state.totalStrokes > 0 ? state.currentIndex / state.totalStrokes : 0;
      setProgress(prog);
      setSpriteState(state.spriteState as SpriteState);

      // 给用户有意义的进度引导（不只是默认消息）
      if (mode === 'follow' && !state.completed) {
        const percent = Math.round(prog * 100);
        if (percent < 10) {
          setSpriteMessage('好的画作从底色开始，让我们耐心铺上第一层~');
        } else if (percent < 25) {
          setSpriteMessage('背景慢慢浮现了，像晨雾中的风景...');
        } else if (percent < 50) {
          setSpriteMessage('快一半了！画面像一首正在写的诗~');
        } else if (percent < 75) {
          setSpriteMessage('细节开始出现了，每一笔都是你的语言');
        } else if (percent < 95) {
          setSpriteMessage('快完成了！大师看到也会微笑的~');
        } else {
          setSpriteMessage('最后几笔...你的画正在呼吸了');
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
          // 批量绘制期间隐藏引导线（防止闪烁）
          batchingRef.current = true;
          setCurrentGuideStroke(null);
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
            // 批量结束后显示最终的下一笔引导
            batchingRef.current = false;
            const finalNext = guide.getCurrentStroke();
            setCurrentGuideStroke(finalNext);
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
    setSpriteMessage('你的画完成了一场和色彩的对话 ✨');
    setProgress(1);
    setCaregiverState('completed');
  }, []);

  const handleReset = () => {
    const paintCanvas = (window as unknown as Record<string, { clearAll: () => void }>).__paintCanvas;
    if (paintCanvas) paintCanvas.clearAll();
    guideRef.current.reset();
    setProgress(0);
    setAutoStartIdx(0);
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

  const handleEnterAutoMode = useCallback(() => {
    if (mode !== 'follow' || strokes.length === 0) return;

    const guide = guideRef.current;
    const startIdx = guide.getState().currentIndex;
    const remaining = strokes.length - startIdx;
    if (remaining <= 0) {
      setSpriteMessage('已经全部画完啦~');
      setSpriteState('cheering');
      return;
    }

    const paintCanvas = (window as unknown as Record<string, { clearUser?: () => void }>).__paintCanvas;
    paintCanvas?.clearUser?.();

    flushSync(() => {
      setAutoStartIdx(startIdx);
      setMode('auto');
    });

    getTracker().setMode('auto', guideSubMode);
    setSpriteMessage('Starry 正在帮你画完剩下的笔触~');
    setSpriteState('guiding');
  }, [mode, strokes.length, guideSubMode]);

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
    const tracker = getTracker();
    tracker.finishSession(dataUrl);
    if (!analyticsSentRef.current) {
      analyticsSentRef.current = true;
      // 上传原画到 OSS
      const sessionPayload = { ...tracker.toAnalyticsJSON(), sessionId: tracker.getSession().id };
      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      }).then(r => r.json()).then(d => {
        if (d.path) tracker.setOriginalImagePath(d.path);
        return fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sessionPayload, originalImagePath: d.path || null }),
        });
      }).catch(() => {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionPayload),
        }).catch(() => {});
      });
    }

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
    setSpriteMessage('深呼吸之后，画笔也变轻了~');
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

    setSdResult(null);
    setSdError(null);

    const tracker = getTracker();
    tracker.finishSession(dataUrl);
    if (!analyticsSentRef.current) {
      analyticsSentRef.current = true;
      const sessionPayload = { ...tracker.toAnalyticsJSON(), sessionId: tracker.getSession().id };
      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      }).then(r => r.json()).then(d => {
        if (d.path) tracker.setOriginalImagePath(d.path);
        return fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sessionPayload, originalImagePath: d.path || null }),
        });
      }).catch(() => {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionPayload),
        }).catch(() => {});
      });
    }

    // 生成轮播文案
    const commentary = generateSDRenderCommentary({
      masterId: styleId,
      colorDistribution: tracker.getColorDistribution(),
      strokeRhythm: tracker.getStrokeRhythm(),
      durationMinutes: tracker.getDurationMinutes(),
      emotionBefore: tracker.getSession().emotionBefore || sessionStorage.getItem('star-bindpaint-emotion-before') || '',
      totalStrokes: tracker.getSession().completedStrokes,
      freeThemeSteps: freeTheme?.steps?.map(s => s.hint),
    });
    setSdCommentary(commentary);

    // 启动假进度计时（200ms 刷新）
    sdStartTimeRef.current = Date.now();
    setSdElapsed(0);
    sdTimerRef.current = setInterval(() => {
      setSdElapsed(Date.now() - sdStartTimeRef.current);
    }, 200);

    setSdRendering(true);
    setSpriteMessage('Starry 正在把你的画变成一首诗...');
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
      setSpriteMessage('看！你的涂鸦变成了一幅画~');
      setSpriteState('cheering');

      // 上传 AI 生成图并更新埋点
      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: data.imageBase64 }),
      }).then(r => r.json()).then(d => {
        const sessionId = tracker.getSession().id;
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            renderedImagePath: d.path || null,
            renderedAt: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }),
          }),
        }).catch(() => {});
      }).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setSdError(message);
      setSpriteMessage(`渲染失败：${message}`);
      setSpriteState('idle');
    } finally {
      if (sdTimerRef.current) clearInterval(sdTimerRef.current);
      sdTimerRef.current = null;
      setSdRendering(false);
    }
  };

  const hasPaintingProgress = useCallback(() => {
    if (mode === 'free') {
      return placedStickers.length > 0 || canUndo;
    }
    if (mode === 'follow') {
      return progress > 0.01 || userStrokeCount > 0;
    }
    if (mode === 'auto') {
      return progress > 0.01;
    }
    return false;
  }, [mode, placedStickers.length, canUndo, progress, userStrokeCount]);

  const clearFreeCanvas = useCallback(() => {
    const paintCanvas = (window as unknown as Record<string, { clearAll?: () => void }>).__paintCanvas;
    paintCanvas?.clearAll?.();
    setPlacedStickers([]);
    setTracingRefs([]);
    setUserStrokeCount(0);
    setCanUndo(false);
    setShowPanel(difficultyLevel === 'sticker');
    setStickerGuideVisible(false);
    setEraserMode(false);
    setSprayMode(false);
  }, [difficultyLevel]);

  const goBackToThemePicker = useCallback(() => {
    clearFreeCanvas();
    setFreeTheme(null);
    setFreeThemeStep(0);
    setShowFreeThemes(true);
    setStickerGuideVisible(false);
    setSpriteState('guiding');
    setSpriteMessage('选一个梦想，让 Starry 陪你把它画出来');
  }, [clearFreeCanvas]);

  const executeBack = useCallback((target: BackTarget) => {
    if (target === 'themes') {
      goBackToThemePicker();
    } else {
      router.push('/create');
    }
    setLeaveConfirm(null);
  }, [goBackToThemePicker, router]);

  const requestBack = useCallback((target: BackTarget) => {
    if (hasPaintingProgress()) {
      setLeaveConfirm({ target });
    } else {
      executeBack(target);
    }
  }, [hasPaintingProgress, executeBack]);

  const handleBack = useCallback(() => {
    if (sdRendering) return;
    if (sdResult) {
      setSdResult(null);
      return;
    }
    if (showPostEmotion || showCalm || showAttention) return;

    if (mode === 'free') {
      if (!showFreeThemes) {
        requestBack('themes');
      } else {
        requestBack('create');
      }
    } else {
      requestBack('create');
    }
  }, [
    sdRendering,
    sdResult,
    showPostEmotion,
    showCalm,
    showAttention,
    mode,
    showFreeThemes,
    requestBack,
  ]);

  const backLabel = useMemo(() => {
    if (mode === 'free') {
      if (!showFreeThemes) return '换主题';
      return '选画';
    }
    return '返回';
  }, [mode, showFreeThemes]);

  const showThemeTracingScene =
    mode === 'free' &&
    !!freeTheme &&
    !showFreeThemes &&
    (
      difficultyLevel === 'tracing' ||
      (difficultyLevel === 'sticker' && stickerGuideVisible)
    );

  /** 底栏高度：贴纸栏 fixed 贴在此之上，画板保持全高 */
  const paintBarBottom = 'calc(5rem + env(safe-area-inset-bottom, 0px))';

  const applyFreeTheme = (theme: FreeTheme | null) => {
    setFreeTheme(theme);
    setFreeThemeStep(0);
    setShowFreeThemes(false);
    setPlacedStickers([]);
    setStickerGuideVisible(false);
    if (theme && difficultyLevel === 'tracing') {
      const scene = createThemeTracingRef(theme.id, canvasSize.w, canvasSize.h);
      setTracingRefs(scene ? [scene] : []);
      setShowPanel(false);
      setSpriteMessage(theme.steps[0]?.hint || '跟着虚线描一描吧~');
    } else if (theme && difficultyLevel === 'sticker') {
      setTracingRefs([]);
      setShowPanel(true);
      setSpriteMessage(theme.steps[0]?.hint || '开始画吧~');
    } else {
      setTracingRefs([]);
      setShowPanel(difficultyLevel === 'sticker');
      setSpriteMessage('跟着心画吧~');
    }
    if (theme) getTracker().setThemeId(theme.id);
  };

  // 描画临摹：主题选定后确保场景图加载（canvas 尺寸就绪后补一次）
  useEffect(() => {
    if (mode !== 'free' || difficultyLevel !== 'tracing' || !freeTheme || showFreeThemes) return;
    const scene = createThemeTracingRef(freeTheme.id, canvasSize.w, canvasSize.h);
    if (!scene) return;
    setTracingRefs(prev => {
      const existing = prev.find(r => r.id === 'theme-scene');
      if (existing?.src === scene.src) {
        return prev.map(r => r.id === 'theme-scene' ? { ...r, ...scene, visible: r.visible } : r);
      }
      return [scene];
    });
  }, [mode, difficultyLevel, freeTheme, showFreeThemes, canvasSize.w, canvasSize.h]);

  const compressImage = (dataUrl: string, maxSize = 400, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.naturalWidth, h = img.naturalHeight;
          if (Math.max(w, h) > maxSize) {
            const scale = maxSize / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          const result = canvas.toDataURL('image/jpeg', quality);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = dataUrl;
    });
  };

  const tracingReferenceVisible =
    tracingRefs.find(r => r.id === 'theme-scene')?.visible ?? true;

  const handleToggleTracingReference = useCallback(() => {
    if (!freeTheme) return;
    const sceneRef = tracingRefs.find(r => r.id === 'theme-scene');
    const currentlyVisible = sceneRef?.visible ?? true;
    if (sceneRef) {
      setTracingRefs(prev => prev.map(r =>
        r.id === 'theme-scene' ? { ...r, visible: !currentlyVisible } : r
      ));
    } else {
      const scene = createThemeTracingRef(freeTheme.id, canvasSize.w, canvasSize.h);
      if (scene) setTracingRefs([{ ...scene, visible: !currentlyVisible }]);
    }
  }, [freeTheme, tracingRefs, canvasSize.w, canvasSize.h]);

  const handleSDSave = async (imageBase64: string) => {
    try {
      // 始终先压缩（SD返回的图太大，无论存 OSS 还是 localStorage 都先压缩）
      const compressed = await compressImage(imageBase64);
      await uploadAndSaveToGallery(
        compressed,
        `油画版 ${new Date().toLocaleDateString('zh-CN')}`,
        0,
        'free'
      );
      setSpriteMessage('油画版已放进画廊！');
      setSpriteState('cheering');
    } catch (err) {
      console.error('[SD Save] 失败:', err);
      setSpriteMessage(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
    setSdResult(null);
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
          {loadingMsg || '每一笔都在等待它的故事...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white" data-calm={settings.calmMode}>
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 gap-2"
        style={{ borderBottom: '2px solid #1A1A1A' }}>
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 rounded-full transition-all"
          style={{
            background: '#FFFFFF',
            border: '2px solid #1A1A1A',
            boxShadow: '3px 3px 0 #1A1A1A',
            padding: '0.5em 1.1em',
          }}
          title={backLabel}
        >
          <ChevronLeft size={16} strokeWidth={2.8} color="#1A1A1A" />
          <span style={{ color: '#1A1A1A', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '-0.01em' }}>
            {backLabel}
          </span>
        </button>

        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          {mode === 'follow' && '跟画'}
          {mode === 'auto' && '自动播放'}
          {mode === 'free' && '自由创作'}
        </span>

        {mode === 'free' ? (
          <div aria-hidden="true" style={{ width: 78 }} />
        ) : (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-full transition-all"
            style={{
              background: '#7A51EC',
              border: '2px solid #1A1A1A',
              boxShadow: '3px 3px 0 #1A1A1A',
              padding: '0.5em 1.2em',
            }}
            title="放进画廊"
          >
            <ImagePlus size={15} strokeWidth={2.5} color="#FFFFFF" />
            <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '-0.01em' }}>完成</span>
          </button>
        )}
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

        {/* Canvas area — 全高，贴纸栏 fixed 贴底栏上方不挤占画板 */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-3 relative min-w-0 min-h-0"
          style={{
            background: '#FAFAFA',
            pointerEvents: (sdRendering || sdResult || showPostEmotion || showCalm) ? 'none' : 'auto',
            paddingBottom: paintBarBottom,
          }}>

          {/* 自由模式主题选择 */}
          {mode === 'free' && showFreeThemes && (
            <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(250,250,250,0.95)' }}>
              <FreeModeThemes
                onSelect={(theme) => applyFreeTheme(theme)}
                onSkip={() => applyFreeTheme(null)}
              />
            </div>
          )}

          <div className="w-full h-full flex items-center justify-center min-h-0 min-w-0">
          <PaintCanvas
            width={canvasSize.w}
            height={canvasSize.h}
            mode={mode}
            strokes={strokes}
            currentGuideStroke={currentGuideStroke}
            guideSubMode={guideSubMode}
            brushWidth={brushWidth}
            autoSpeed={autoSpeed}
            autoStartIdx={autoStartIdx}
            masterStyle={selectedStyle}
            freeColor={freeColor}
            freeSat={freeSat}
            freeVal={freeVal}
            eraserMode={eraserMode}
            sprayMode={sprayMode}
            onUserStrokeDone={handleUserStrokeDone}
            onUserStrokeStart={() => {
              getTracker().strokeStart();
              emotionDetectorRef.current?.reportPointerDown();
            }}
            onUndoAvailable={setCanUndo}
            onAutoProgress={handleAutoProgress}
            onAutoComplete={handleAutoComplete}
            sourceImage={sourceImage}
            tracingSceneSrc={
              showThemeTracingScene
                ? THEME_TRACING_SCENES[freeTheme!.id] ?? null
                : null
            }
            tracingSceneVisible={
              showThemeTracingScene
                ? difficultyLevel === 'tracing'
                  ? (tracingRefs.find(r => r.id === 'theme-scene')?.visible ?? true)
                  : true
                : false
            }
          >
            {/* 贴纸/描画 React overlay — 画布内部 */}
            {mode === 'free' && (difficultyLevel === 'sticker' || difficultyLevel === 'tracing') && (
              <>
                {placedStickers.map(s => (
                  <StickerItem
                    key={s.id}
                    sticker={s}
                    containerWidth={canvasSize.w}
                    containerHeight={canvasSize.h}
                    onFix={(id) => {
                      const sticker = placedStickers.find(p => p.id === id);
                      if (sticker) {
                        const pc = (window as unknown as Record<string, {
                          getBaseCanvas: () => HTMLCanvasElement | null;
                          saveUndoSnapshot: () => void;
                        }>).__paintCanvas;
                        pc?.saveUndoSnapshot();
                        const img = new Image();
                        img.onload = () => {
                          const baseCanvas = pc?.getBaseCanvas();
                          if (baseCanvas) {
                            const ctx = baseCanvas.getContext('2d');
                            if (ctx) drawStickerOnCanvas(ctx, sticker, img);
                          }
                        };
                        img.src = sticker.src;
                      }
                      setPlacedStickers(prev => prev.filter(p => p.id !== id));
                    }}
                    onDelete={(id) => {
                      setPlacedStickers(prev => prev.filter(p => p.id !== id));
                    }}
                    onMove={(id, x, y) => {
                      setPlacedStickers(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
                    }}
                    onResize={(id, w, h) => {
                      setPlacedStickers(prev => prev.map(p => p.id === id ? { ...p, width: w, height: h } : p));
                    }}
                  />
                ))}
                {tracingRefs.filter(r => r.id !== 'theme-scene').map(t => (
                  <TracingItem
                    key={t.id}
                    tracing={t}
                    containerWidth={canvasSize.w}
                    containerHeight={canvasSize.h}
                    onMove={(x, y) => setTracingRefs(prev => prev.map(r => r.id === t.id ? { ...r, x, y } : r))}
                    onResize={(w, h) => setTracingRefs(prev => prev.map(r => r.id === t.id ? { ...r, width: w, height: h } : r))}
                  />
                ))}
              </>
            )}
          </PaintCanvas>
          </div>

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

          {/* 贴纸栏：fixed 紧贴底栏上方，画板尺寸不变 */}
          <AnimatePresence>
            {mode === 'free' && !showFreeThemes && difficultyLevel === 'sticker' && (
              <StickerPanel
                mode="sticker"
                themeId={freeTheme?.id}
                hasTracing={false}
                persistent
                bottomOffset={paintBarBottom}
                onSelectSticker={(s: StickerDef) => {
                  const id = `s${++stickerIdRef.current}`;
                  void loadStickerDimensions(s.src).then(({ width, height }) => {
                    setPlacedStickers(prev => [...prev, {
                      id,
                      src: s.src,
                      x: canvasSize.w / 2,
                      y: canvasSize.h / 2,
                      width,
                      height,
                    }]);
                  });
                }}
                onSwitchToBrush={() => {}}
                onClose={() => {}}
              />
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* 自由创作：右侧竖向紧凑卡片栈，可整体折叠成小球 */}
      {mode === 'free' ? (
        <div
          className="fixed z-30 flex flex-col gap-2 pointer-events-none"
          style={{
            top: 'clamp(64px, 10vw, 80px)',
            right: 'clamp(8px, 2vw, 14px)',
            width: promptCardCollapsed ? 52 : 'clamp(104px, 28vw, 156px)',
          }}
        >
          {promptCardCollapsed ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="pointer-events-auto flex items-center justify-center rounded-full bg-white"
              style={{
                width: 52,
                height: 52,
                border: '2px solid #1A1A1A',
                boxShadow: '4px 4px 0 #1A1A1A',
              }}
              onClick={() => setPromptCardCollapsed(false)}
              aria-label="展开自由创作提示"
              title="展开提示"
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>★</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0, x: 16, y: -8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-[1.05rem] bg-white pointer-events-auto"
                style={{
                  border: '2px solid #1A1A1A',
                  boxShadow: '3px 3px 0 #1A1A1A',
                  padding: '0.55rem 0.45rem',
                }}
                onClick={() => setPromptCardCollapsed(true)}
                aria-label="折叠自由创作提示"
                title="折叠提示"
              >
                <ProgressRing progress={progress} size={54} strokeWidth={5} label="自由创作" />
                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#999', lineHeight: 1 }}>
                  点击收起
                </span>
              </motion.button>

              {freeTheme && !showFreeThemes && (
                <div className="pointer-events-auto min-w-0">
                  <ThemeStepGuide
                    theme={freeTheme}
                    currentStep={freeThemeStep}
                    compact
                    onNextStep={() => {
                      if (freeThemeStep < freeTheme.steps.length - 1) {
                        const next = freeThemeStep + 1;
                        setFreeThemeStep(next);
                        setSpriteMessage(freeTheme.steps[next].hint);
                      } else {
                        // 最后一步「画好了」→ 先变成油画，再由 SD 结果页面引导完成
                        handleSDRender();
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div
          className="fixed z-30 flex flex-col gap-3 pointer-events-none"
          style={{
            top: 'clamp(64px, 10vw, 80px)',
            right: 'clamp(8px, 2vw, 16px)',
            width: promptCardCollapsed ? 52 : 'clamp(132px, 32vw, 196px)',
          }}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="flex flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-white pointer-events-auto"
            style={{
              border: '2px solid #1A1A1A',
              boxShadow: '4px 4px 0 #1A1A1A',
              minHeight: promptCardCollapsed ? 52 : undefined,
              padding: promptCardCollapsed ? 0 : '0.75rem',
            }}
            onClick={() => setPromptCardCollapsed(prev => !prev)}
            aria-label={promptCardCollapsed ? '展开提示卡片' : '折叠提示卡片'}
            title={promptCardCollapsed ? '展开提示' : '折叠提示'}
          >
            {promptCardCollapsed ? (
              <span style={{ fontSize: 24, lineHeight: 1 }}>★</span>
            ) : (
              <>
                <StarrySprite state={spriteState} message={spriteMessage} />
                <div className="flex justify-center pt-1">
                  <ProgressRing
                    progress={progress}
                    label={`${Math.round(progress * strokes.length)} / ${strokes.length} 笔`}
                  />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#999', marginTop: -2 }}>
                  点击收起
                </span>
              </>
            )}
          </motion.button>
        </div>
      )}

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
        {sdRendering && (
          <SDRenderLoading
              styleName={selectedStyle?.name || '梵高'}
              progress={sdElapsed > 0 ? Math.min(sdElapsed / 20000 * 0.98, 0.98) : 0}
              commentaryMessages={sdCommentary}
            />
        )}
        {sdResult && (
          <SDRenderResult
            originalImage={sdResult.original}
            renderedImage={sdResult.rendered}
            style={selectedStyle?.name || '梵高'}
            duration={sdResult.duration}
            onClose={() => setSdResult(null)}
            onSave={handleSDSave}
            onFinish={() => {
              setSdResult(null);
              handleExport();
            }}
          />
        )}
        {leaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(8px)', pointerEvents: 'auto' }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center"
              style={{ border: '2px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A' }}
            >
              <div className="mb-3" style={{ fontSize: 42, lineHeight: 1 }}>🎨</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' }}>
                {leaveConfirm.target === 'themes' ? '换主题？' : '离开画板？'}
              </h3>
              <p className="mt-3" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#666', lineHeight: 1.6 }}>
                当前画的内容不会保存
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setLeaveConfirm(null)}
                  className="flex-1 rounded-full font-bold text-sm"
                  style={{
                    background: '#FFFFFF',
                    color: '#1A1A1A',
                    border: '2px solid #1A1A1A',
                    boxShadow: '3px 3px 0 #1A1A1A',
                    cursor: 'pointer',
                    padding: '0.85em 1.2em',
                  }}
                >
                  继续画
                </button>
                <button
                  onClick={() => executeBack(leaveConfirm.target)}
                  className="flex-1 rounded-full font-bold text-sm"
                  style={{
                    background: '#7A51EC',
                    color: 'white',
                    border: '2px solid #1A1A1A',
                    boxShadow: '3px 3px 0 #1A1A1A',
                    cursor: 'pointer',
                    padding: '0.85em 1.2em',
                  }}
                >
                  {leaveConfirm.target === 'themes' ? '换主题' : '离开'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {sdError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(8px)', pointerEvents: 'auto' }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center"
              style={{ border: '2px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A' }}
            >
              <div className="mb-3" style={{ fontSize: 42, lineHeight: 1 }}>🪄</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' }}>油画生成失败</h3>
              <p className="mt-3" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#666', lineHeight: 1.6 }}>
                {sdError}
              </p>
              <p className="mt-2" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#999', lineHeight: 1.5 }}>
                如果是在 Vercel，请确认已配置 HUNYUAN_API_KEY 或 DASHSCOPE_API_KEY。
              </p>
              <button
                onClick={() => setSdError(null)}
                className="mt-5 w-full rounded-full font-bold text-sm"
                style={{
                  background: '#7A51EC',
                  color: 'white',
                  border: '2px solid #1A1A1A',
                  boxShadow: '3px 3px 0 #1A1A1A',
                  cursor: 'pointer',
                  padding: '0.85em 1.2em',
                }}
              >
                回到画板检查
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Bottom Toolbar (Figma-style) ═══ */}
      <PaintBottomBar
        mode={mode}
        onModeChange={(m) => {
          if (mode === m) return;
          if (mode === 'free') return;
          if (m === 'free' && sourceImage) return;
          if (m === 'auto' && mode === 'follow') {
            handleEnterAutoMode();
            return;
          }

          setMode(m);
          getTracker().setMode(m, guideSubMode);
          if (m === 'free' && !selectedStyle) {
            setSelectedStyle(MASTER_STYLES[1]);
          }
        }}
        onEnterAutoMode={handleEnterAutoMode}
        brushWidth={brushWidth}
        onBrushWidthChange={setBrushWidth}
        guideSubMode={guideSubMode}
        onGuideSubModeChange={setGuideSubMode}
        fillMode={fillMode}
        onFillModeChange={setFillMode}
        autoFillRatio={autoFillRatio}
        onAutoFillRatioChange={setAutoFillRatio}
        autoSpeed={autoSpeed}
        onAutoSpeedChange={setAutoSpeed}
        totalStrokes={strokes.length}
        currentStrokeIdx={Math.round(progress * strokes.length)}
        onBatchDraw={handleBatchDraw}
        onSkip={handleSkip}
        onReset={handleReset}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        freeColor={freeColor}
        onFreeColorChange={setFreeColor}
        freeSat={freeSat}
        onFreeSatChange={setFreeSat}
        freeVal={freeVal}
        onFreeValChange={setFreeVal}
        onSDRender={handleSDRender}
        sdRendering={sdRendering}
        eraserMode={eraserMode}
        onToggleEraser={() => {
          setEraserMode(prev => !prev);
          if (!eraserMode) setSprayMode(false);
        }}
        sprayMode={sprayMode}
        onToggleSpray={handleToggleSpray}
        canUndo={canUndo}
        onUndo={handleUndo}
        showStickerGuide={
          mode === 'free' &&
          difficultyLevel === 'sticker' &&
          !showFreeThemes &&
          !!freeTheme &&
          !!THEME_TRACING_SCENES[freeTheme.id]
        }
        stickerGuideVisible={stickerGuideVisible}
        onToggleStickerGuide={() => setStickerGuideVisible(v => !v)}
        showTracingReference={
          mode === 'free' &&
          difficultyLevel === 'tracing' &&
          !showFreeThemes &&
          !!freeTheme
        }
        tracingReferenceVisible={tracingReferenceVisible}
        onToggleTracingReference={handleToggleTracingReference}
      />

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

'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CircleDot, ImagePlus, Layers3, Moon, Route, Sparkles } from 'lucide-react';
import PaintCanvas, { PaintMode } from '@/components/PaintCanvas';
import PaintBottomBar from '@/components/PaintBottomBar';
import MoonCompanion, { CompanionState } from '@/components/MoonCompanion';
import ProgressRing from '@/components/ProgressRing';
import VisualSchedule from '@/components/VisualSchedule';
import FreeModeThemes, { FreeTheme, ThemeStepGuide } from '@/components/FreeModeThemes';
import SDRenderResult from '@/components/SDRenderResult';
import SDRenderLoading from '@/components/SDRenderLoading';
import StickerPanel, { StickerDef } from '@/components/StickerPanel';
import StickerItem, { PlacedSticker } from '@/components/StickerItem';
import TracingItem, { TracingRef } from '@/components/TracingItem';
import { decomposeImage, imageSourceFromImage, GuidanceLevel, StrokeDrawData, Vec2 } from '@/lib/stroke-engine';
import { GuideSystem } from '@/lib/guide-system';
import { uploadAndSaveToGallery } from '@/lib/gallery-store';
import { getTracker, resetTracker } from '@/lib/painting-tracker';
import { generateSDRenderCommentary } from '@/lib/feedback-engine';
import { MASTER_STYLES, MasterStyleProfile } from '@/lib/style-transfer';
import { createThemeTracingRef, THEME_TRACING_SCENES } from '@/lib/tracing-scenes';
import { drawStickerOnCanvas, loadStickerDimensions } from '@/lib/sticker-utils';
import { recordPracticeCompletion, recordPracticeStart } from '@/lib/practice-store';
import { getResearchEnvelope, loadPrivacyPreferences } from '@/lib/privacy-settings';
import { useAppSettings } from '@/contexts/AppContext';

function sessionResearchPayload(tracker: ReturnType<typeof getTracker>) {
  const envelope = getResearchEnvelope();
  return envelope ? { ...tracker.toAnalyticsJSON(), ...envelope } : null;
}

function sendResearchRecord(payload: Record<string, unknown>, keepalive = false) {
  return fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive,
  }).catch(() => null);
}

export default function PaintPage() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [mode, setMode] = useState<PaintMode>('follow');
  const [guideSubMode, setGuideSubMode] = useState<'assist' | 'real'>('real');
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('full');
  const [brushWidth, setBrushWidth] = useState(4);
  const [autoSpeed, setAutoSpeed] = useState(200);
  const [autoStartIdx, setAutoStartIdx] = useState(0);
  const [autoCompletionPending, setAutoCompletionPending] = useState(false);
  const [autoFillRatio, setAutoFillRatio] = useState(10);
  const [fillMode, setFillMode] = useState<'companion' | 'precise'>('precise');
  const [strokes, setStrokes] = useState<StrokeDrawData[]>([]);
  const [currentGuideStroke, setCurrentGuideStroke] = useState<StrokeDrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [spriteState, setSpriteState] = useState<CompanionState>('thinking');
  const [spriteMessage, setSpriteMessage] = useState('正在分析图片...');
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 400 });

  const [showCompletion, setShowCompletion] = useState(false);
  const [savedDataUrl, setSavedDataUrl] = useState<string>('');

  const [freeTheme, setFreeTheme] = useState<FreeTheme | null>(null);
  const [freeThemeStep, setFreeThemeStep] = useState(0);
  const [showFreeThemes, setShowFreeThemes] = useState(true); // 自由模式初始显示主题选择
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
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [stickerGuideVisible, setStickerGuideVisible] = useState(false);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [tracingRefs, setTracingRefs] = useState<TracingRef[]>([]);
  const stickerIdRef = useRef(0);

  // SD 渲染
  const [sdRendering, setSdRendering] = useState(false);
  const [sdResult, setSdResult] = useState<{ original: string; rendered: string; duration: number } | null>(null);
  const [sdError, setSdError] = useState<string | null>(null);
  const [sdElapsed, setSdElapsed] = useState(0);
  const [sdCommentary, setSdCommentary] = useState<string[]>([]);
  const sdStartTimeRef = useRef(0);
  const sdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyticsSentRef = useRef(false); // 防止同一次 session 重复上报
  const autoTrackedIndexRef = useRef(0);
  const trackerInitializedRef = useRef(false);
  const abandonmentTimerRef = useRef<number | null>(null);

  type BackTarget = 'themes' | 'create';
  const [leaveConfirm, setLeaveConfirm] = useState<{ target: BackTarget } | null>(null);

  // 组件卸载时清理 SD 计时器
  useEffect(() => {
    return () => {
      if (sdTimerRef.current) clearInterval(sdTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (abandonmentTimerRef.current !== null) {
      window.clearTimeout(abandonmentTimerRef.current);
      abandonmentTimerRef.current = null;
    }

    const recordAbandonedSession = (tracker = getTracker()) => {
      if (analyticsSentRef.current) return;
      const session = tracker.getSession();
      if (session.startTime <= 0 || session.endTime > 0) return;

      tracker.abandonSession();
      const researchPayload = sessionResearchPayload(tracker);
      if (!researchPayload) return;
      analyticsSentRef.current = true;
      const payload = JSON.stringify(researchPayload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
    const handlePageHide = () => recordAbandonedSession();

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      const trackerAtUnmount = getTracker();
      abandonmentTimerRef.current = window.setTimeout(() => recordAbandonedSession(trackerAtUnmount), 0);
    };
  }, []);

  const guideRef = useRef<GuideSystem>(new GuideSystem());
  const batchingRef = useRef(false); // 批量绘制中，抑制引导线更新

  useEffect(() => {
    if (!trackerInitializedRef.current) {
      resetTracker();
      trackerInitializedRef.current = true;
    }

    // 检查是否是自由创作模式（无需源图片）
    const freeStyleId = sessionStorage.getItem('star-bindpaint-free-style');
    if (freeStyleId) {
      const savedGuidance = (sessionStorage.getItem('startrace-guidance-level') || 'full') as GuidanceLevel;
      const style = MASTER_STYLES.find(s => s.id === freeStyleId) || MASTER_STYLES[1]; // 默认梵高
      setSelectedStyle(style);
      setMode('free');
      setGuidanceLevel(savedGuidance);
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
      tracker.setGuidanceLevel(savedGuidance);
      tracker.setCanvasSize(768, 768);
      tracker.setCustomUpload();
      tracker.startSession(0);
      return;
    }

    const dataUrl = sessionStorage.getItem('star-bindpaint-source');
    if (!dataUrl) { router.push('/create'); return; }

    const savedRoughness = parseInt(sessionStorage.getItem('star-bindpaint-roughness') || '2');
    const savedGuidance = (sessionStorage.getItem('startrace-guidance-level') || 'full') as GuidanceLevel;
    setGuidanceLevel(savedGuidance);

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
      setSpriteMessage('正在把画面拆成一条条星迹…');

      try {
        const imgSrc = imageSourceFromImage(img, 512);
        setLoadingMsg('正在分析画面结构与笔触方向…');
        const result = await decomposeImage(imgSrc, cw, ch, {
          roughness: savedRoughness,
          lloydIter: 12,
          palette: 'original',
        });

        setLoadingMsg(`生成了 ${result.length} 笔触，准备中...`);
        setStrokes(result);

        // 初始化数据采集器
        const tracker = getTracker();
        tracker.setMode('follow', 'real');
        tracker.setGuidanceLevel(savedGuidance);
        tracker.setRoughness(savedRoughness);
        tracker.setCanvasSize(cw, ch);
        const masterInfo = sessionStorage.getItem('star-bindpaint-master');
        if (masterInfo) {
          const { id, title, artist } = JSON.parse(masterInfo);
          tracker.setMasterwork(id, title, artist);
        } else {
          tracker.setCustomUpload();
        }
        tracker.startSession(result.length);

        guideRef.current.loadStrokes(result);
        const state = guideRef.current.getState();
        setCurrentGuideStroke(state.currentStroke);
        setSpriteState('guiding');
        setSpriteMessage(`已经生成 ${result.length} 条星迹，从黄色星点开始。`);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setSpriteMessage('星迹生成失败，请返回重新选择图片。');
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
      setSpriteState(state.spriteState as CompanionState);

      // 给用户有意义的进度引导（不只是默认消息）
      if (mode === 'follow' && !state.completed) {
        const percent = Math.round(prog * 100);
        if (percent < 10) {
          setSpriteMessage('先完成大形笔触，画面的骨架会慢慢出现。');
        } else if (percent < 25) {
          setSpriteMessage('大形已经出现，继续沿星迹建立画面结构。');
        } else if (percent < 50) {
          setSpriteMessage('接近一半了，现在正在补充中等大小的笔触。');
        } else if (percent < 75) {
          setSpriteMessage('细节开始出现，注意每条星迹的方向变化。');
        } else if (percent < 95) {
          setSpriteMessage('已经进入最后的细节层，保持自己的绘画节奏。');
        } else {
          setSpriteMessage('最后几条星迹，完成后就能点亮这幅作品。');
        }
      } else {
        setSpriteMessage(state.message);
      }

      if (state.completed) {
        setProgress(1);
      }
    });

    return unsubscribe;
  }, [guideSubMode, mode]);

  const handleUserStrokeDone = useCallback((userPoints: Vec2[], score: number) => {
    const tracker = getTracker();

    if (mode === 'follow') {
      const guide = guideRef.current;
      const guideState = guide.getState();

      const region = currentGuideStroke?.points?.[Math.floor((currentGuideStroke?.points?.length || 0) / 2)]
        || { x: 0, y: 0 };
      const color = currentGuideStroke
        ? `rgba(${Math.round(currentGuideStroke.color[0]*255)},${Math.round(currentGuideStroke.color[1]*255)},${Math.round(currentGuideStroke.color[2]*255)},1)`
        : '';

      const { passed, shouldReplace } = guide.submitStroke(score);

      const paintCanvas = (window as unknown as Record<string, {
        drawAIStrokeOnBase: (stroke: StrokeDrawData) => void;
        commitUserToBase: () => void;
        clearUser: () => void;
      }>).__paintCanvas;

      if (!passed) {
        tracker.strokeRejected();
        paintCanvas?.clearUser();
        return;
      }

      tracker.strokeCompleted(guideState.currentIndex, color, region, score);

      setUserStrokeCount(previous => previous + 1);

      if (shouldReplace && currentGuideStroke) {
        paintCanvas?.clearUser();
        paintCanvas?.drawAIStrokeOnBase(currentGuideStroke);
      } else {
        paintCanvas?.commitUserToBase();
      }

      if (fillMode === 'companion' && autoFillRatio > 0 && paintCanvas) {
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
          if (drawn > 0) tracker.strokesBatched(guideState.currentIndex + 1, drawn);
          batchingRef.current = false;
          setCurrentGuideStroke(guide.getCurrentStroke());
        }, 300);
      }
    } else if (mode === 'free') {
      setUserStrokeCount(previous => previous + 1);
      const center = userPoints.length > 0
        ? userPoints[Math.floor(userPoints.length / 2)]
        : { x: 0, y: 0 };
      tracker.strokeCompleted(tracker.getSession().strokes.length, '', center, score);
      guideRef.current.freeModeFeedback();
    }
  }, [mode, currentGuideStroke, fillMode, autoFillRatio]);

  const handleAutoProgress = useCallback((current: number, total: number) => {
    if (current > autoTrackedIndexRef.current) {
      getTracker().strokesBatched(autoTrackedIndexRef.current, current - autoTrackedIndexRef.current);
      autoTrackedIndexRef.current = current;
    }
    guideRef.current.syncProgress(current);
    setProgress(current / total);
  }, []);

  const handleAutoComplete = useCallback(() => {
    guideRef.current.syncProgress(strokes.length, true);
    setSpriteState('cheering');
    setSpriteMessage('全部星迹已经点亮，正在为你整理作品。');
    setProgress(1);
    setAutoCompletionPending(true);
  }, [strokes.length]);

  const handleReset = () => {
    const paintCanvas = (window as unknown as Record<string, { clearAll: () => void }>).__paintCanvas;
    if (paintCanvas) paintCanvas.clearAll();
    const previousTracker = getTracker();
    const previousSession = previousTracker.getSession();
    if (previousSession.startTime > 0 && previousSession.endTime === 0) {
      previousTracker.abandonSession();
      const payload = sessionResearchPayload(previousTracker);
      if (payload) sendResearchRecord(payload, true);
    }

    const nextMode = mode === 'auto' ? 'follow' : mode;
    const tracker = resetTracker();
    if (previousSession.masterwork) {
      tracker.setMasterwork(previousSession.masterwork.id, previousSession.masterwork.title, previousSession.masterwork.artist);
    } else {
      tracker.setCustomUpload();
    }
    tracker.setMode(nextMode, guideSubMode);
    tracker.setGuidanceLevel(guidanceLevel);
    tracker.setRoughness(previousSession.roughness);
    tracker.setCanvasSize(canvasSize.w, canvasSize.h);
    if (previousSession.difficulty) tracker.setDifficulty(previousSession.difficulty);
    if (previousSession.styleId) tracker.setStyleId(previousSession.styleId);
    if (previousSession.themeId) tracker.setThemeId(previousSession.themeId);
    tracker.startSession(nextMode === 'free' ? 0 : strokes.length);

    guideRef.current.reset();
    setProgress(0);
    setAutoStartIdx(0);
    autoTrackedIndexRef.current = 0;
    setAutoCompletionPending(false);
    setUserStrokeCount(0);
    analyticsSentRef.current = false;
    if (mode === 'auto') {
      setMode('follow');
    }
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

  const handleEnterAutoMode = useCallback(() => {
    if (mode !== 'follow' || strokes.length === 0) return;

    const guide = guideRef.current;
    const startIdx = guide.getState().currentIndex;
    const remaining = strokes.length - startIdx;
    if (remaining <= 0) {
      setSpriteMessage('全部星迹已经点亮，可以完成并保存作品。');
      setSpriteState('cheering');
      setAutoCompletionPending(true);
      return;
    }

    const paintCanvas = (window as unknown as Record<string, { clearUser?: () => void }>).__paintCanvas;
    paintCanvas?.clearUser?.();

    flushSync(() => {
      setAutoStartIdx(startIdx);
      setMode('auto');
    });

    autoTrackedIndexRef.current = startIdx;
    getTracker().recordAutoStart();
    getTracker().setMode('auto', guideSubMode);
    setSpriteMessage('月亮伙伴正在演示剩余星迹。');
    setSpriteState('guiding');
  }, [mode, strokes.length, guideSubMode]);

  const handlePauseAuto = useCallback(() => {
    const guide = guideRef.current;
    setMode('follow');
    setCurrentGuideStroke(guide.getCurrentStroke());
    getTracker().setMode('follow', guideSubMode);
    setSpriteMessage('自动续画已暂停，随时可以从这里继续。');
    setSpriteState('guiding');
  }, [guideSubMode]);

  const handleBatchDraw = (count: number) => {
    const paintCanvas = (window as unknown as Record<string, {
      drawAIStrokeOnBase: (s: StrokeDrawData) => void;
      clearUser: () => void;
    }>).__paintCanvas;
    if (!paintCanvas) return;

    const tracker = getTracker();
    const guide = guideRef.current;
    const startIdx = guide.getState().currentIndex;

    let drawn = 0;
    for (let i = 0; i < count; i++) {
      const stroke = guide.getCurrentStroke();
      if (!stroke) break;
      paintCanvas.drawAIStrokeOnBase(stroke);
      guide.skip();
      drawn++;
    }

    if (drawn > 0) tracker.strokesBatched(startIdx, drawn);
  };

  // ── 完成作品 ──
  const handleExport = useCallback(() => {
    const paintCanvas = (window as unknown as Record<string, { getBaseCanvas: () => HTMLCanvasElement | null }>).__paintCanvas;
    if (!paintCanvas) return;
    const canvas = paintCanvas.getBaseCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const tracker = getTracker();
    tracker.finishSession(dataUrl);
    if (!analyticsSentRef.current) {
      const payload = sessionResearchPayload(tracker);
      if (payload) {
        analyticsSentRef.current = true;
        sendResearchRecord(payload);
      }
    }

    setSavedDataUrl(dataUrl);
    setShowCompletion(true);
    setSpriteMessage('这幅作品已经点亮，保存后会进入你的星图。');
    setSpriteState('cheering');
  }, []);

  useEffect(() => {
    if (!autoCompletionPending) return;
    const timer = window.setTimeout(() => {
      setAutoCompletionPending(false);
      handleExport();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [autoCompletionPending, handleExport]);

  const recordSavedPractice = (galleryItemId: string) => {
    const session = getTracker().getSession();
    recordPracticeCompletion({
      sessionId: session.id,
      galleryItemId,
      completedAt: new Date(session.endTime || Date.now()).toISOString(),
      mode: session.mode,
      userStrokes: Math.max(session.completedStrokes, userStrokeCount),
      totalStrokes: Math.max(session.totalStrokes, strokes.length, session.completedStrokes, userStrokeCount),
      durationMs: session.startTime > 0 ? Math.max(0, (session.endTime || Date.now()) - session.startTime) : 0,
      guidanceLevel,
    });
  };

  const handleCompletionSave = async () => {
    const dataUrl = savedDataUrl;
    if (!dataUrl) return;

    const tracker = getTracker();
    tracker.finishSession(dataUrl);
    const session = tracker.getSession();

    const privacy = loadPrivacyPreferences();
    const galleryItem = await uploadAndSaveToGallery(
      dataUrl,
      `作品 ${new Date().toLocaleDateString('zh-CN')}`,
      Math.max(strokes.length, session.completedStrokes, userStrokeCount),
      mode,
      {
        userStrokeCount: Math.max(session.completedStrokes, userStrokeCount),
        guidanceLevel,
        durationMs: session.startTime > 0 ? Math.max(0, session.endTime - session.startTime) : 0,
      },
      privacy.artworkCloudUpload,
      privacy.participantId,
    );
    const reportSession = { ...session, finalImageBase64: '' };
    try {
      sessionStorage.setItem('star-bindpaint-session', JSON.stringify(reportSession));
      sessionStorage.setItem('star-bindpaint-report-gallery-id', galleryItem.id);
      sessionStorage.removeItem('star-bindpaint-prompt');
    } catch {
      // 作品已进入星图，反馈数据写入失败不应阻断保存流程。
    }
    recordSavedPractice(galleryItem.id);

    setSpriteMessage('作品已保存到星图。');
    setShowCompletion(false);
    router.push('/gallery');
  };

  // ── AI 星光变换（风格化渲染）──
  const handleSDRender = async () => {
    if (settings.confirmBeforeAi && sessionStorage.getItem('startrace-ai-transfer-confirmed') !== 'true') {
      const confirmed = window.confirm('AI 星光变换需要把当前画布临时发送给图像生成服务，仅用于本次生成。是否继续？');
      if (!confirmed) return;
      sessionStorage.setItem('startrace-ai-transfer-confirmed', 'true');
    }
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
      const payload = sessionResearchPayload(tracker);
      if (payload) {
        analyticsSentRef.current = true;
        sendResearchRecord(payload);
      }
    }

    // 生成轮播文案
    const commentary = generateSDRenderCommentary({
      masterId: styleId,
      colorDistribution: tracker.getColorDistribution(),
      strokeRhythm: tracker.getStrokeRhythm(),
      durationMinutes: tracker.getDurationMinutes(),
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
    setSpriteMessage('月亮伙伴正在生成风格化结果…');
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
      setSpriteMessage('AI 风格化结果已经生成，看看星光变换前后的差别。');
      setSpriteState('cheering');

      const envelope = getResearchEnvelope();
      if (envelope) {
        sendResearchRecord({
          ...envelope,
          recordType: 'render',
          sessionId: tracker.getSession().id,
          renderedAt: new Date().toISOString(),
          durationMs: Number(data.duration) || null,
        });
      }
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
    setSpriteMessage('选择一个主题，月亮伙伴会提供绘画步骤。');
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
    if (showCompletion) return;

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
    showCompletion,
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
      const compressed = await compressImage(imageBase64);
      const session = getTracker().getSession();
      const privacy = loadPrivacyPreferences();
      const practiceDetails = {
        userStrokeCount: Math.max(session.completedStrokes, userStrokeCount),
        guidanceLevel,
        durationMs: session.startTime > 0 ? Math.max(0, (session.endTime || Date.now()) - session.startTime) : 0,
      };
      // 保存 AI 生成图
      const renderedItem = await uploadAndSaveToGallery(
        compressed,
        `AI 风格版 ${new Date().toLocaleDateString('zh-CN')}`,
        Math.max(session.completedStrokes, userStrokeCount),
        'free',
        practiceDetails,
        privacy.artworkCloudUpload,
        privacy.participantId,
      );
      recordSavedPractice(renderedItem.id);
      // 同时保存原画
      if (sdResult?.original) {
        const originalCompressed = await compressImage(sdResult.original);
        await uploadAndSaveToGallery(
          originalCompressed,
          `原画 ${new Date().toLocaleDateString('zh-CN')}`,
          Math.max(session.completedStrokes, userStrokeCount),
          'free',
          practiceDetails,
          privacy.artworkCloudUpload,
          privacy.participantId,
        );
      }
      setSpriteMessage('原画和 AI 风格版都已放进星图。');
      setSpriteState('cheering');
    } catch (err) {
      console.error('[SD Save] 失败:', err);
      setSpriteMessage(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
    setSdResult(null);
  };

  const currentStep = Math.min(strokes.length, Math.round(progress * strokes.length) + (progress < 1 ? 1 : 0));
  const phaseLabel = progress < 0.25 ? '建立大形' : progress < 0.65 ? '组织结构' : progress < 0.95 ? '补充细节' : '完成作品';
  const guidanceLabel: Record<GuidanceLevel, string> = {
    full: '完整星迹',
    balanced: '适度星迹',
    light: '起点提示',
  };
  const currentStrokeColor = currentGuideStroke
    ? `rgb(${Math.round(currentGuideStroke.color[0] * 255)}, ${Math.round(currentGuideStroke.color[1] * 255)}, ${Math.round(currentGuideStroke.color[2] * 255)})`
    : '#D9DDEA';

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6" style={{ background: '#F6F7FB' }}>
        <div className="w-full max-w-sm rounded-[2rem] bg-white p-7" style={{ border: '2px solid #17233F', boxShadow: '7px 7px 0 #6558D9' }}>
          <MoonCompanion state={spriteState} message={spriteMessage} />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full"
          style={{ border: '3px solid #E5E5E5', borderTopColor: '#7A51EC' }}
        />
        <p style={{ fontSize: '0.85rem', color: '#888888', fontWeight: 700 }}>
          {loadingMsg || '正在准备第一颗星点…'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-1 flex-col bg-white">
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

        <span className="inline-flex items-center gap-2" style={{ fontWeight: 900, fontSize: '0.95rem', color: '#17233F', letterSpacing: '-0.02em' }}>
          {mode === 'follow' && <><Route size={17} color="#6558D9" /> 沿星迹绘画</>}
          {mode === 'auto' && <><Sparkles size={17} color="#6558D9" /> 月亮伙伴自动续画</>}
          {mode === 'free' && <><Sparkles size={17} color="#6558D9" /> 自由星域</>}
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
            />
          </div>
        )}

        {/* Canvas area — 全高，贴纸栏 fixed 贴底栏上方不挤占画板 */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-3 relative min-w-0 min-h-0"
          style={{
            background: '#FAFAFA',
            pointerEvents: (sdRendering || sdResult || showCompletion) ? 'none' : 'auto',
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
            guidanceLevel={guidanceLevel}
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
              const tracker = getTracker();
              tracker.strokeStart();
              const session = tracker.getSession();
              recordPracticeStart(session.id, session.mode);
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

          {/* 贴纸栏：fixed 紧贴底栏上方，画板尺寸不变 */}
          <AnimatePresence>
            {mode === 'free' && !showFreeThemes && difficultyLevel === 'sticker' && showPanel && !panelCollapsed && (
              <StickerPanel
                mode="sticker"
                themeId={freeTheme?.id}
                hasTracing={false}
                onCollapse={() => { setPanelCollapsed(true); setShowPanel(false); }}
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

          {/* 贴纸栏收起后右侧浮动按钮 */}
          {panelCollapsed && difficultyLevel === 'sticker' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => { setPanelCollapsed(false); setShowPanel(true); }}
              className="fixed z-30 rounded-full flex items-center justify-center"
              style={{ right: 12, bottom: 'clamp(90px, 14vw, 120px)', width: 40, height: 40, background: '#7DC353', border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}
              title="展开贴纸栏"
            >
              <span style={{ fontSize: '1.1rem' }}>🖼️</span>
            </motion.button>
          )}
        </div>

      </div>

      {/* 自由星域：月亮伙伴与主题步骤使用同一套世界观反馈 */}
      {mode === 'free' ? (
        <div
          className="fixed z-30 flex flex-col gap-2 pointer-events-none"
          style={{
            top: 'clamp(64px, 10vw, 80px)',
            right: 'clamp(8px, 2vw, 14px)',
            width: promptCardCollapsed ? 52 : 'clamp(190px, 28vw, 238px)',
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
              aria-label="展开月亮伙伴"
              title="展开月亮伙伴"
            >
              <Moon size={25} color="#17233F" strokeWidth={2.6} />
            </motion.button>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, x: 16, y: -8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="rounded-[1.3rem] bg-white pointer-events-auto"
                style={{
                  border: '2px solid #17233F',
                  boxShadow: '5px 5px 0 #6558D9',
                  padding: '0.72rem',
                }}
              >
                <MoonCompanion state={spriteState} message={spriteMessage} compact />
                <div className="my-3 h-px" style={{ background: '#D9DDEA' }} />
                <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#F6F7FB' }}>
                  <div>
                    <p className="text-[9px] font-black tracking-[0.1em]" style={{ color: '#6558D9' }}>自由星域</p>
                    <p className="mt-1 text-xs font-black" style={{ color: '#17233F' }}>已留下 {userStrokeCount} 笔星光</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FFD166', border: '1.5px solid #17233F' }}><Sparkles size={18} color="#17233F" /></span>
                </div>
                <button type="button" onClick={() => setPromptCardCollapsed(true)} className="mt-3 w-full text-center text-[10px] font-black" style={{ color: '#8E98AD' }}>收起月亮伙伴</button>
              </motion.div>

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
                        // 最后一步「画好了」→ 进入 AI 星光变换
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
            width: promptCardCollapsed ? 52 : 'clamp(190px, 28vw, 248px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="rounded-[1.4rem] bg-white pointer-events-auto"
            style={{
              border: '2px solid #17233F',
              boxShadow: '5px 5px 0 #6558D9',
              minHeight: promptCardCollapsed ? 52 : undefined,
              padding: promptCardCollapsed ? 0 : '0.75rem',
            }}
          >
            {promptCardCollapsed ? (
              <button type="button" onClick={() => setPromptCardCollapsed(false)} className="flex h-[52px] w-[52px] items-center justify-center" aria-label="展开月亮伙伴">
                <Moon size={25} color="#17233F" strokeWidth={2.6} />
              </button>
            ) : (
              <div>
                <MoonCompanion state={spriteState} message={spriteMessage} compact />
                <div className="my-3 h-px" style={{ background: '#D9DDEA' }} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black tracking-[0.1em]" style={{ color: '#6558D9' }}>{phaseLabel}</p>
                    <p className="mt-1 text-xs font-black">星迹 {currentStep} / {strokes.length}</p>
                  </div>
                  <ProgressRing progress={progress} size={48} strokeWidth={5} />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#F6F7FB' }}>
                  <span className="inline-flex items-center gap-2 text-[10px] font-black"><span className="h-4 w-4 rounded-full" style={{ background: currentStrokeColor, border: '1.5px solid #17233F' }} />当前笔触</span>
                  <span className="text-[10px] font-black" style={{ color: '#6558D9' }}>{guidanceLabel[guidanceLevel]}</span>
                </div>
                {mode === 'follow' && progress < 1 && (
                  <button type="button" onClick={handleEnterAutoMode} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-black" style={{ background: '#FFD166', color: '#17233F', border: '1.5px solid #17233F', boxShadow: '2px 2px 0 #17233F' }}>
                    <Sparkles size={15} /> 月亮伙伴完成剩余 {Math.max(0, strokes.length - Math.round(progress * strokes.length))} 笔
                  </button>
                )}
                {mode === 'auto' && progress < 1 && (
                  <button type="button" onClick={handlePauseAuto} className="mt-3 w-full rounded-xl px-3 py-2.5 text-[11px] font-black text-white" style={{ background: '#6558D9', border: '1.5px solid #17233F' }}>暂停自动续画</button>
                )}
                {progress >= 1 && (
                  <button type="button" onClick={handleExport} className="mt-3 w-full rounded-xl px-3 py-2.5 text-[11px] font-black text-white" style={{ background: '#17233F', boxShadow: '2px 2px 0 #FFD166' }}>完成并保存作品</button>
                )}
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {([
                    ['full', Route, '完整'],
                    ['balanced', Layers3, '适度'],
                    ['light', CircleDot, '起点'],
                  ] as const).map(([level, Icon, label]) => (
                    <button key={level} type="button" onClick={() => { setGuidanceLevel(level); getTracker().setGuidanceLevel(level); sessionStorage.setItem('startrace-guidance-level', level); }} className="rounded-xl px-2 py-2 text-center" style={{ background: guidanceLevel === level ? '#FFD166' : '#F6F7FB', border: `1.5px solid ${guidanceLevel === level ? '#17233F' : 'transparent'}` }}>
                      <Icon className="mx-auto" size={15} strokeWidth={2.6} />
                      <span className="mt-1 block text-[9px] font-black">{label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setPromptCardCollapsed(true)} className="mt-3 w-full text-center text-[10px] font-black" style={{ color: '#8E98AD' }}>收起月亮伙伴</button>
              </div>
            )}
          </motion.div>
        </div>
      )}

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
            onFinish={async () => {
              try {
                const compressed = await compressImage(sdResult.rendered);
                const session = getTracker().getSession();
                const privacy = loadPrivacyPreferences();
                const galleryItem = await uploadAndSaveToGallery(
                  compressed,
                  `AI 风格版 ${new Date().toLocaleDateString('zh-CN')}`,
                  Math.max(session.completedStrokes, userStrokeCount),
                  'free',
                  {
                    userStrokeCount: Math.max(session.completedStrokes, userStrokeCount),
                    guidanceLevel,
                    durationMs: session.startTime > 0 ? Math.max(0, (session.endTime || Date.now()) - session.startTime) : 0,
                  },
                  privacy.artworkCloudUpload,
                  privacy.participantId,
                );
                recordSavedPractice(galleryItem.id);
              } catch (err) {
                console.error('[SD Finish] AI 图保存失败:', err);
              }
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' }}>AI 星光变换失败</h3>
              <p className="mt-3" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#666', lineHeight: 1.6 }}>
                {sdError}
              </p>
              <p className="mt-2" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#999', lineHeight: 1.5 }}>
                图像生成服务暂时不可用，请稍后重试。
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
          if (m === 'follow' && mode === 'auto') {
            handlePauseAuto();
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

      {/* ═══ 作品完成弹窗 ═══ */}
      {showCompletion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(23,35,63,0.7)', backdropFilter: 'blur(10px)' }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-full max-w-md rounded-[2rem] bg-white p-6"
            style={{ border: '2px solid #17233F', boxShadow: '9px 9px 0 #6558D9' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: '#FFD166', border: '2px solid #17233F' }}><Sparkles size={24} color="#17233F" strokeWidth={2.6} /></span>
              <div><p className="text-[10px] font-black tracking-[0.12em]" style={{ color: '#6558D9' }}>点亮一颗新星</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em]" style={{ color: '#17233F' }}>本次绘画已经完成</h3></div>
            </div>

            {savedDataUrl && <div className="mt-5 aspect-[4/3] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${savedDataUrl})`, border: '2px solid #17233F' }} role="img" aria-label="本次绘画作品预览" />}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                [`${Math.round(progress * 100)}%`, '星迹进度'],
                [String(userStrokeCount), '亲手完成'],
                [guidanceLabel[guidanceLevel], '引导方式'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: '#F6F7FB' }}><p className="text-sm font-black" style={{ color: '#17233F' }}>{value}</p><p className="mt-1 text-[9px] font-extrabold" style={{ color: '#536079' }}>{label}</p></div>
              ))}
            </div>

            <p className="mt-4 text-sm font-bold leading-6" style={{ color: '#536079' }}>作品会进入“我的星图”，本次完成笔触与辅助使用情况也会保留下来，帮助你观察练习变化。</p>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowCompletion(false)} className="flex-1 rounded-full px-4 py-3 text-sm font-black" style={{ border: '2px solid #17233F', color: '#17233F' }}>继续调整</button>
              <button onClick={handleCompletionSave} className="flex-1 rounded-full px-4 py-3 text-sm font-black text-white" style={{ background: '#17233F', boxShadow: '3px 3px 0 #FFD166' }}>保存到星图</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CircleDot, ImagePlus, Layers3, Route, Sparkles } from 'lucide-react';
import PaintCanvas, { PaintMode } from '@/components/PaintCanvas';
import PaintBottomBar from '@/components/PaintBottomBar';
import MoonCompanion, { CompanionState } from '@/components/MoonCompanion';
import ProgressRing from '@/components/ProgressRing';
import VisualSchedule from '@/components/VisualSchedule';
import StickerPanel, { StickerDef } from '@/components/StickerPanel';
import StickerItem, { PlacedSticker } from '@/components/StickerItem';
import TracingItem, { TracingRef } from '@/components/TracingItem';
import { imageSourceFromImage, GuidanceLevel, StrokeDrawData, Vec2 } from '@/lib/stroke-engine';
import { preparePainting } from '@/lib/painting-client';
import FloatingCompanion from '@/components/FloatingCompanion';
import ReferencePreview from '@/components/ReferencePreview';
import { GuideSystem } from '@/lib/guide-system';
import { uploadAndSaveToGallery } from '@/lib/gallery-store';
import { getTracker, resetTracker } from '@/lib/painting-tracker';
import { MASTER_STYLES, MasterStyleProfile } from '@/lib/style-transfer';
import { drawStickerOnCanvas, loadStickerDimensions } from '@/lib/sticker-utils';
import { recordPracticeCompletion, recordPracticeStart } from '@/lib/practice-store';
import { getResearchEnvelope, loadPrivacyPreferences } from '@/lib/privacy-settings';

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
  const [planningAttempt, setPlanningAttempt] = useState(0);
  const planningController = useRef<AbortController | null>(null);
  const router = useRouter();
  const [mode, setMode] = useState<PaintMode>('follow');
  const [guideSubMode, setGuideSubMode] = useState<'assist' | 'real'>('real');
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('full');
  const [brushWidth, setBrushWidth] = useState(4);
  const userBrushWidthRef = useRef<number | null>(null);
  const [autoSpeed, setAutoSpeed] = useState(200);
  const [autoStartIdx, setAutoStartIdx] = useState(0);
  const [autoCompletionPending, setAutoCompletionPending] = useState(false);
  const [autoFillRatio, setAutoFillRatio] = useState(10);
  const [fillMode, setFillMode] = useState<'companion' | 'precise'>('precise');
  const [strokes, setStrokes] = useState<StrokeDrawData[]>([]);
  const [currentGuideStroke, setCurrentGuideStroke] = useState<StrokeDrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [progress, setProgress] = useState(0);
  const [spriteState, setSpriteState] = useState<CompanionState>('thinking');
  const [spriteMessage, setSpriteMessage] = useState('正在分析图片...');
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 400 });

  const [showCompletion, setShowCompletion] = useState(false);
  const [savedDataUrl, setSavedDataUrl] = useState<string>('');

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
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [tracingRefs, setTracingRefs] = useState<TracingRef[]>([]);
  const stickerIdRef = useRef(0);

  const analyticsSentRef = useRef(false); // 防止同一次 session 重复上报
  const autoTrackedIndexRef = useRef(0);
  const trackerInitializedRef = useRef(false);
  const abandonmentTimerRef = useRef<number | null>(null);

  const [leaveConfirm, setLeaveConfirm] = useState<boolean | null>(null);

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
      const savedGuidance = 'full' as GuidanceLevel;
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

    const savedRoughness = 1;
    const savedGuidance = 'full' as GuidanceLevel;
    setGuidanceLevel(savedGuidance);

    let cancelled = false;
    const controller = new AbortController();
    planningController.current = controller;
    setLoadError('');
    const fail = (message: string) => {
      if (cancelled) return;
      setLoadError(message);
      setSpriteMessage(message);
      setSpriteState('idle');
    };
    const img = new Image();
    img.onload = async () => {
      if (cancelled) return;
      setSourceImage(img);
      const w = img.naturalWidth;
      const h = img.naturalHeight;

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
        const result = await preparePainting(imgSrc, cw, ch, {
          roughness: savedRoughness,
          lloydIter: 12,
          palette: 'original',
          onProgress: ({ completed, total, strokes }) => {
            if (!cancelled) setLoadingMsg(`画面优化 ${Math.round(completed / total * 100)}% · 已规划 ${strokes} 笔`);
          },
        }, controller.signal);
        if (cancelled) return;
        if (!result.length) {
          fail('这张图片没有可跟随的笔触，请选择主体更清晰、颜色对比更明显的图片。');
          return;
        }

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
        if (state.currentStroke && userBrushWidthRef.current === null) setBrushWidth(state.currentStroke.width);
        setSpriteState('guiding');
        setSpriteMessage(`已经生成 ${result.length} 条星迹，从黄色圆圈 1 开始。`);
        setLoading(false);
      } catch (err) {
        if (!cancelled) fail(controller.signal.aborted ? '已取消规划' : err instanceof Error ? err.message : '星迹生成失败，请重试。');
      }
    };
    img.onerror = () => fail('参考图无法读取，请返回重新选择图片。');
    img.src = dataUrl;
    return () => {
      cancelled = true;
      controller.abort();
      img.onload = null;
      img.onerror = null;
    };
  }, [router, planningAttempt]);

  useEffect(() => {
    const guide = guideRef.current;
    guide.setMode(guideSubMode);
    if (mode === 'free') setSpriteMessage('直接在画布上落笔，自由选择颜色和笔刷风格。');

    const unsubscribe = guide.subscribe((state) => {
      // 批量绘制期间不更新引导线（防止闪烁）
      if (!batchingRef.current) {
        setCurrentGuideStroke(state.currentStroke);
        if (mode === 'follow' && state.currentStroke && userBrushWidthRef.current === null) setBrushWidth(state.currentStroke.width);
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

  const savePaintingUndo = useCallback(() => {
    const pc = (window as unknown as Record<string, { saveUndoSnapshot: (restore: () => void) => void }>).__paintCanvas;
    const index = guideRef.current.getState().currentIndex;
    const restoreCounts = getTracker().captureArtworkProgress();
    pc?.saveUndoSnapshot(() => {
      restoreCounts();
      guideRef.current.syncProgress(index, true);
      setCurrentGuideStroke(guideRef.current.getCurrentStroke());
      setUserStrokeCount(userStrokeCount);
      setAutoStartIdx(index);
      autoTrackedIndexRef.current = index;
      setAutoCompletionPending(false);
      setShowCompletion(false);
      setSpriteMessage('已撤销上一步，可以重新画这一笔。');
    });
  }, [userStrokeCount]);

  const handleUserStrokeStart = useCallback(() => {
    const tracker = getTracker();
    tracker.strokeStart();
    const session = tracker.getSession();
    recordPracticeStart(session.id, session.mode);
  }, []);

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

      if (score > .3 && guideState.waitingForUser && guideState.currentStroke) savePaintingUndo();
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
      }
    } else if (mode === 'free') {
      setUserStrokeCount(previous => previous + 1);
      const center = userPoints.length > 0
        ? userPoints[Math.floor(userPoints.length / 2)]
        : { x: 0, y: 0 };
      tracker.strokeCompleted(tracker.getSession().strokes.length, '', center, score);
      guideRef.current.freeModeFeedback();
    }
  }, [mode, currentGuideStroke, fillMode, autoFillRatio, savePaintingUndo]);

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
      savePaintingUndo();
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
    savePaintingUndo();
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
  }, [mode, strokes.length, guideSubMode, savePaintingUndo]);

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

    if (count > 0 && guide.getCurrentStroke()) savePaintingUndo();
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

  const executeBack = useCallback(() => {
    router.push('/create');
    setLeaveConfirm(null);
  }, [router]);

  const requestBack = useCallback(() => {
    if (hasPaintingProgress()) {
      setLeaveConfirm(true);
    } else {
      executeBack();
    }
  }, [hasPaintingProgress, executeBack]);

  const handleBack = useCallback(() => {
    if (showCompletion) return;

    requestBack();
  }, [showCompletion, requestBack]);

  const backLabel = '返回';
  const paintBarBottom = 'calc(5rem + env(safe-area-inset-bottom, 0px))';

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
        {loadError ? (
          <div className="px-5 text-center" role="alert">
            <p className="max-w-sm text-sm font-bold leading-6 text-[#536079]">{loadError}</p>
            <button onClick={() => setPlanningAttempt(n => n + 1)} className="m-2 rounded-full bg-[#6558D9] px-6 py-3 text-sm font-black text-white">重新生成</button>
            <button onClick={() => router.push('/create')} className="mt-5 rounded-full bg-[#17233F] px-6 py-3 text-sm font-black text-white">
              返回选择图片
            </button>
          </div>
        ) : (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full"
              style={{ border: '3px solid #E5E5E5', borderTopColor: '#7A51EC' }}
            />
            <p style={{ fontSize: '0.85rem', color: '#888888', fontWeight: 700 }}>
              {loadingMsg || '正在准备第一颗星点…'}
            </p>
            <button onClick={() => planningController.current?.abort()} className="rounded-full border-2 border-[#17233F] px-6 py-3 text-sm font-bold">取消规划</button>
          </>
        )}
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
            pointerEvents: showCompletion ? 'none' : 'auto',
            paddingBottom: paintBarBottom,
          }}>

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
            onUserStrokeStart={handleUserStrokeStart}
            onUndoAvailable={setCanUndo}
            onAutoProgress={handleAutoProgress}
            onAutoComplete={handleAutoComplete}
            sourceImage={sourceImage}
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
            {mode === 'free' && difficultyLevel === 'sticker' && showPanel && !panelCollapsed && (
              <StickerPanel
                mode="sticker"
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

      <FloatingCompanion collapsed={promptCardCollapsed} onCollapse={setPromptCardCollapsed}>
        {sourceImage && <ReferencePreview src={sourceImage.src} />}
        {mode === 'free' ? <>
                <MoonCompanion state={spriteState} message={spriteMessage} compact />
                <div className="my-3 h-px" style={{ background: '#D9DDEA' }} />
                <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#F6F7FB' }}>
                  <div>
                    <p className="text-[9px] font-black tracking-[0.1em]" style={{ color: '#6558D9' }}>自由星域</p>
                    <p className="mt-1 text-xs font-black" style={{ color: '#17233F' }}>已留下 {userStrokeCount} 笔星光</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FFD166', border: '1.5px solid #17233F' }}><Sparkles size={18} color="#17233F" /></span>
                </div>
        </> : <div>
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
        </div>}
      </FloatingCompanion>

      <AnimatePresence>
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
                离开画板？
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
                  onClick={() => executeBack()}
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
                  离开
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Bottom Toolbar (Figma-style) ═══ */}
      <PaintBottomBar
        mode={mode}
        onModeChange={(m) => {
          if (mode === m) return;
          if (m !== 'free' && strokes.length === 0) {
            router.push('/create');
            return;
          }
          if (mode === 'auto') handlePauseAuto();
          setEraserMode(false);
          setSprayMode(false);
          if (m === 'auto' && mode === 'follow') {
            handleEnterAutoMode();
            return;
          }
          if (m === 'follow' && mode === 'auto') {
            handlePauseAuto();
            return;
          }

          if (m === 'auto') {
            savePaintingUndo();
            setAutoStartIdx(guideRef.current.getState().currentIndex);
          }
          if (m === 'free') setBrushWidth(userBrushWidthRef.current ?? 6);

          setMode(m);
          getTracker().setMode(m, guideSubMode);
          if (m === 'free' && !selectedStyle) {
            setSelectedStyle(MASTER_STYLES[1]);
          }
        }}
        onEnterAutoMode={handleEnterAutoMode}
        brushWidth={brushWidth}
        onBrushWidthChange={width => { userBrushWidthRef.current = width; setBrushWidth(width); }}
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
        eraserMode={eraserMode}
        onToggleEraser={() => {
          setEraserMode(prev => !prev);
          if (!eraserMode) setSprayMode(false);
        }}
        sprayMode={sprayMode}
        onToggleSpray={handleToggleSpray}
        canUndo={canUndo}
        onUndo={handleUndo}
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

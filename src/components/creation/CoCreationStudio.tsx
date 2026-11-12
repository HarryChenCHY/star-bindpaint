'use client';

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, Shapes, Palette, Timer, Image, Save, Gauge, Zap, ChevronsRight, Sun, Flame, Flower2, Sparkles, Sunset, Sparkle, Moon, Eraser, Paintbrush } from 'lucide-react';
import { drawExpressiveStroke, DEFAULT_EXPRESSION, type ExpressionSettings, type ExpressiveStroke } from '@/lib/expressive-painter';
import { readCanvas, whiteCanvas, type Material } from '@/lib/co-create';
import CanvasViewport from './CanvasViewport';
import ArtworkSave from './ArtworkSave';
import StudioWorkspace from './StudioWorkspace';
import useMaterialLayout from './useMaterialLayout';
import { strokeFrame, bristleFade, lightSpeedCount, brushTravelDuration, brushTravelFrame } from '@/lib/stroke-playback';
import { startAnimationLoop } from '@/lib/animation-loop';
import { MATERIAL_LIBRARY } from '@/lib/material-library';
import MaterialLibrary from './MaterialLibrary';
import MaterialConfirmation from './MaterialConfirmation';
import ReferencePreview from '@/components/ReferencePreview';
import { useStudioSession } from './StudioSession';
import StudyArtworkSave from './StudyArtworkSave';
import useStudyStudio, { loadStudyCanvas, type StudyStudioOptions } from './useStudyStudio';

const W = 640, H = 480;
const PAINTING_PHASES = ['正在铺出整体轮廓与大色块', '正在塑造中等形体与色彩关系', '正在完善局部结构', '正在做少量强调与收束'];
type WorkerMessage = { type: 'batch'; strokes: ExpressiveStroke[] } | { type: 'progress'; progress: { completed: number; total: number } } | { type: 'done' } | { type: 'error'; message: string };

export default function CoCreationStudio({ source, onReset, study }: { source: string | null; onReset: () => void; study?: StudyStudioOptions }) {
  const session = useStudioSession();
  const allowLayout = study?.allowLayout ?? true;
  const { photo, resumeImage, resumeReference, resumeLayout, onEvent } = study ?? {};
  const studySession = Boolean(study);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<ExpressiveStroke[]>([]);
  const indexRef = useRef(0);
  const textureRef = useRef<HTMLCanvasElement>(null);
  const fadingRef = useRef<{ stroke: ExpressiveStroke; end: number }[]>([]);
  const lightRef = useRef<{ start: number; elapsed: number; total: number } | null>(null);
  const brushRef = useRef<SVGGElement>(null);
  const brushTipRef = useRef<{ x: number; y: number } | null>(null);
  const brushAngleRef = useRef(-45);
  const playbackRef = useRef<{ stroke: ExpressiveStroke; base: ImageData; progress: number; travel: number; from: { x: number; y: number }; fromAngle: number } | null>(null);
  const versionRef = useRef(0);
  const planningRef = useRef(false);
  const fullPaintingPendingRef = useRef(false);
  const fullPaintingPassRef = useRef(0);
  const playingRef = useRef(false);
  const readyRef = useRef(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expressionRef = useRef<ExpressionSettings>({ ...DEFAULT_EXPRESSION });
  const priorityRef = useRef<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [navigating, setNavigating] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [hasStarted, setHasStarted] = useState(Boolean(resumeImage));
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [uploads, setUploads] = useState<Material[]>([]);
  const [expression, setExpression] = useState<ExpressionSettings>({ ...DEFAULT_EXPRESSION });
  const [appliedExpression, setAppliedExpression] = useState<ExpressionSettings>({ ...DEFAULT_EXPRESSION });
  const [drawn, setDrawn] = useState(0);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(140);
  const confirmationId = useRef(0);
  const [confirmation, setConfirmation] = useState<{ id: number; x: number; y: number } | null>(null);
  const [status, setStatus] = useState('正在准备画布…');

  const stopWorker = useCallback(() => {
    versionRef.current++;
    workerRef.current?.terminate(); workerRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    planningRef.current = false;
  }, []);

  const pause = useCallback(() => {
    if (playingRef.current) onEvent?.('auto_pause');
    playingRef.current = false; setPlaying(false);
    setStatus(allowLayout ? '已暂停。可以继续绘制，也可以加入新的素材。' : '已暂停，可以继续绘制。');
  }, [allowLayout, onEvent]);
  useEffect(() => session.registerPause(pause), [session, pause]);

  const plan = useCallback((priority?: { x: number; y: number; width: number; height: number }) => {
    const canvas = canvasRef.current, target = targetRef.current;
    if (!canvas || !target) return;
    const resumePass = priority && fullPaintingPendingRef.current ? Math.min(2, fullPaintingPassRef.current) : undefined;
    if (!priority) { fullPaintingPendingRef.current = true; fullPaintingPassRef.current = 0; }
    stopWorker();
    playbackRef.current = null;
    lightRef.current = null;
    if (brushRef.current) brushRef.current.style.opacity = '0';
    priorityRef.current = priority;
    const version = versionRef.current;
    queueRef.current = []; indexRef.current = 0;
    dirtyRef.current = true;
    planningRef.current = true; playingRef.current = true;
    setHasStarted(true); setPlanning(true); setPlaying(true); setHasPending(true); setError(''); setProgress(0);
    onEvent?.('auto_planning');
    setStatus(priority ? '素材已确认，正在准备新的笔触…' : '正在准备笔触，画面会逐渐出现…');
    function fail(message: string) {
      if (version !== versionRef.current) return;
      stopWorker(); playingRef.current = false; setPlanning(false); setPlaying(false);
      onEvent?.('auto_error');
      setError(message); setStatus('已保留当前画面和确认的素材，可以重试续绘。');
    }
    try {
      const worker = new Worker(new URL('../../workers/co-create.worker.ts', import.meta.url));
      workerRef.current = worker;
      timerRef.current = setTimeout(() => fail('续绘计算超时，请重试。'), 120_000);
      worker.onerror = () => fail('续绘暂时中断，请重试。');
      worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        if (version !== versionRef.current) return;
        if (data.type === 'batch') queueRef.current.push(...data.strokes);
        if (data.type === 'progress') setProgress(Math.round(data.progress.completed / data.progress.total * 100));
        if (data.type === 'error') fail(data.message);
        if (data.type === 'done') {
          dirtyRef.current = false; planningRef.current = false; setPlanning(false);
          worker.terminate(); workerRef.current = null;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
      worker.postMessage({ target: readCanvas(target), current: readCanvas(canvas), priority, resumePass, origin: brushTipRef.current ?? undefined, settings: expressionRef.current });
    } catch { fail('无法启动绘制，请重试。'); }
  }, [stopWorker, onEvent]);

  useEffect(() => {
    let last = 0;
    function tick(now: number): void | false {
      // React can detach refs before passive effect cleanup on navigation.
      // Stop this loop instead of reading a removed canvas or queuing more work.
      const canvas = canvasRef.current;
      const textureCanvas = textureRef.current;
      if (!canvas || !textureCanvas) return false;
      const ctx = canvas.getContext('2d');
      const texture = textureCanvas.getContext('2d');
      if (!ctx || !texture) return false;
      const delta = last ? Math.min(64, now - last) : 0;
      const lightDelta = last && !document.hidden ? now - last : 0;
      last = now;
      texture.clearRect(0, 0, W, H);
      fadingRef.current = fadingRef.current.filter(item => now - item.end < 3000);
      for (const item of fadingRef.current) drawExpressiveStroke(texture, item.stroke, true, bristleFade(now - item.end));
      const partial = playbackRef.current;
      if (partial && partial.progress > 0 && (!playingRef.current || speed === 0)) drawExpressiveStroke(texture, strokeFrame(partial.stroke, partial.progress).stroke, true);
      if (!playingRef.current || !readyRef.current) {
        if (brushRef.current) brushRef.current.style.opacity = '0';
        return;
      }
      const stroke = queueRef.current[indexRef.current];
      if (stroke?.planning && fullPaintingPendingRef.current) fullPaintingPassRef.current = stroke.planning.pass;
      if (speed === 0 && stroke) {
        if (planningRef.current) {
          if (brushRef.current) brushRef.current.style.opacity = '0';
          return;
        }
        if (playbackRef.current) { ctx.putImageData(playbackRef.current.base, 0, 0); playbackRef.current = null; }
        if (!lightRef.current) {
          lightRef.current = { start: indexRef.current, elapsed: 0, total: queueRef.current.length - indexRef.current };
          setStatus('光速绘制中…');
        }
        const light = lightRef.current;
        light.elapsed += lightDelta;
        const until = light.start + lightSpeedCount(light.total, light.elapsed);
        const before = indexRef.current;
        while (indexRef.current < until) {
          const next = queueRef.current[indexRef.current++];
          drawExpressiveStroke(ctx, next);
          fadingRef.current.push({ stroke: next, end: now });
          brushTipRef.current = next.points.at(-1)!;
          if (next.planning && fullPaintingPendingRef.current) fullPaintingPassRef.current = next.planning.pass;
        }
        if (indexRef.current > before) {
          if (before === 0) onEvent?.('auto_playing');
          session.markChanged();
          const completed = indexRef.current - before;
          setDrawn(n => n + completed);
          if (brushRef.current && brushTipRef.current) {
            brushAngleRef.current = strokeFrame(queueRef.current[indexRef.current - 1], 1).angle;
            brushRef.current.style.opacity = '1';
            brushRef.current.setAttribute('transform', `translate(${brushTipRef.current.x} ${brushTipRef.current.y}) rotate(${brushAngleRef.current + 45})`);
          }
        }
        return;
      }
      if (speed !== 0) lightRef.current = null;
      if (stroke) {
        if (!playbackRef.current) {
          if (indexRef.current === 0) onEvent?.('auto_playing');
          playbackRef.current = { stroke, base: ctx.getImageData(0, 0, W, H), progress: 0, travel: 0, from: brushTipRef.current ?? stroke.points[0], fromAngle: brushAngleRef.current };
          setStatus(`${stroke.planning ? PAINTING_PHASES[stroke.planning.pass] : '正在绘制'}。${allowLayout ? '随时选择素材，加入你的新想法。' : ''}`);
        }
        const active = playbackRef.current;
        let tip = stroke.points[0];
        let angle = -45;
        let lift = 0;
        if (active.travel < 1) {
          const distance = Math.hypot(tip.x - active.from.x, tip.y - active.from.y);
          active.travel = Math.min(1, active.travel + delta / brushTravelDuration(distance, speed));
          const frame = brushTravelFrame(active.from, tip, active.fromAngle, strokeFrame(stroke, 0).angle, active.travel);
          tip = frame.tip; angle = frame.angle; lift = frame.lift;
        } else {
          const length = strokeFrame(stroke, 0).length;
          active.progress = Math.min(1, active.progress + delta / (Math.max(90, speed * 3) * Math.max(.6, Math.min(2, length / 80))));
          const sample = strokeFrame(stroke, active.progress);
          // Restore the same baseline each frame: translucent paint must not accumulate.
          ctx.putImageData(active.base, 0, 0);
          drawExpressiveStroke(ctx, sample.stroke);
          session.markChanged();
          drawExpressiveStroke(texture, sample.stroke, true);
          tip = sample.tip; angle = sample.angle;
        }
        brushTipRef.current = tip;
        brushAngleRef.current = angle;
        if (brushRef.current) {
          brushRef.current.style.opacity = String(1 - lift * .25);
          brushRef.current.setAttribute('transform', `translate(${tip.x} ${tip.y - lift * 5}) rotate(${angle + 45}) scale(${1 + lift * .06})`);
        }
        if (active.progress === 1) {
          fadingRef.current.push({ stroke, end: now });
          playbackRef.current = null;
          indexRef.current++; setDrawn(n => n + 1);
        }
      } else if (!planningRef.current) {
        fullPaintingPendingRef.current = false;
        if (brushRef.current) brushRef.current.style.opacity = '0';
        playingRef.current = false; setPlaying(false); setHasPending(false);
        onEvent?.('auto_done');
        setStatus(allowLayout ? '这一轮绘制完成。可以保存，也可以继续加入素材。' : '这一轮绘制完成，可以提交作品。');
      } else if (brushRef.current) {
        brushRef.current.style.opacity = '0';
      }
    }
    return startAnimationLoop(tick);
  }, [speed, session, allowLayout, onEvent]);

  function applyExpression() {
    expressionRef.current = { ...expression }; setAppliedExpression({ ...expression });
    if (source || confirmed.length) plan();
    else setStatus('已设置画面表现，加入素材后会按这个方式绘制。');
  }
  const expressionChanged = expression.abstraction !== appliedExpression.abstraction || expression.mood !== appliedExpression.mood;

  const materials = useMaterialLayout({
    canvas: canvasRef, target: targetRef, pause, initialPhoto: allowLayout && !resumeLayout && !resumeReference ? source : null,
    onConfirm: (bounds, labels, placements) => {
      studyStudio.confirmLayout(labels, placements);
      setConfirmed(items => [...items, ...labels]);
      setConfirmation({ id: ++confirmationId.current, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
      plan(bounds);
    },
  });

  const getCanvas = useCallback(() => canvasRef.current, []);
  const studyStudio = useStudyStudio(study, materials, () => readyRef.current ? canvasRef.current : null, () => confirmed.length || resumeReference ? targetRef.current : null, pause);
  const restoreStudyLayout = useEffectEvent(() => studyStudio.restoreLayout());

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    fullPaintingPendingRef.current = false; fullPaintingPassRef.current = 0;
    brushTipRef.current = null; brushAngleRef.current = -45;
    targetRef.current = whiteCanvas(W, H);
    async function initialize() {
      try {
        if (studySession) {
          const fixedPhoto = !allowLayout ? photo : undefined;
          const [artwork, target] = await Promise.all([
            resumeImage ? loadStudyCanvas(resumeImage) : undefined,
            loadStudyCanvas(resumeReference ?? fixedPhoto),
          ]);
          if (cancelled) return;
          if (artwork) ctx.drawImage(artwork, 0, 0);
          targetRef.current = target;
          restoreStudyLayout();
          if (resumeImage) onEvent?.('resume_snapshot');
          if (resumeReference || fixedPhoto) {
            dirtyRef.current = true;
            setHasPending(true);
          }
        }
        if (cancelled) return;
        readyRef.current = true; setReady(true);
        if (!allowLayout) setStatus('参考图已就绪。点击开始绘制。');
        else if (source) setStatus(resumeReference ? '已恢复画面。你可以继续绘制或调整素材。' : '照片可以移动、缩放和擦除。编排后确认，开始绘制。');
        else setStatus('从素材库添加素材，编排并确认后，笔触会逐步画出你的想法。');
      } catch { if (!cancelled) { setError('底图加载失败，请返回创作入口重新选择。'); setStatus('画布尚未准备好。'); } }
    }
    void initialize();
    return () => { cancelled = true; readyRef.current = false; playingRef.current = false; stopWorker(); };
  }, [source, stopWorker, studySession, allowLayout, photo, resumeImage, resumeReference, onEvent]);

  function addMaterial(material: Material, variation: number, position?: { x: number; y: number }) {
    materials.add(material, position, variation);
    onEvent?.('material_add', material.id);
  }

  function resume() {
    onEvent?.('auto_requested');
    if (dirtyRef.current && !planningRef.current) plan(priorityRef.current);
    else if (indexRef.current < queueRef.current.length || planningRef.current) { playingRef.current = true; setPlaying(true); setStatus('正在继续绘制…'); }
  }
  const canResume = !playing && (materials.pending || hasPending);

  const workspaceState = navigating ? '移动画布 · 素材手势已关闭' : error ? '需要处理' : !ready ? '准备画布' : materials.pending ? '调整素材' : playing ? (planning && !drawn ? '准备笔触' : '正在绘制') : hasPending ? (hasStarted ? '已暂停' : '参考图已就绪') : '等待你的想法';
  const main = <section className="creation-main co-creation-main">
      <div className="creation-canvas-heading"><h1>共创画布</h1><span className="creation-note">{confirmed.length} 个素材 · {drawn} 笔</span></div>
      <div className="studio-canvas-area"><CanvasViewport onDeselect={materials.deselect} onNavigationChange={setNavigating}>
      <div className="co-canvas-wrap" onDragOver={e => {
        if (allowLayout && ready && !materials.busy && e.dataTransfer.types.includes('application/x-startrace-material')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
      }} onDrop={e => {
        const material = [...MATERIAL_LIBRARY.map(item => item.material), ...uploads].find(m => m.id === e.dataTransfer.getData('application/x-startrace-material'));
        if (!allowLayout || !material || !ready || materials.busy) return;
        e.preventDefault();
        const bounds = canvasRef.current!.getBoundingClientRect();
        const variation = Number(e.dataTransfer.getData('application/x-startrace-variation'));
        addMaterial(material, Number.isInteger(variation) && variation >= 0 && variation < 4 ? variation : 0, { x: (e.clientX - bounds.left) * W / bounds.width, y: (e.clientY - bounds.top) * H / bounds.height });
      }}>
        <canvas ref={canvasRef} width={W} height={H} aria-label="AI共创画布" data-testid="co-canvas" />
        <canvas ref={textureRef} width={W} height={H} className="stroke-texture-overlay" aria-hidden="true" />
        <svg className="stroke-brush-overlay" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><g ref={brushRef} opacity="0">
          <path d="M0 0 Q-4 -7 1 -14 L8 -10 Q8 -3 0 0Z" fill="#b6bcc7" stroke="#252932" strokeWidth="1" />
          <path d="M1 -14 L8 -10 L13 -19 L6 -23Z" fill="#e3e7ee" stroke="#252932" strokeWidth="1" />
          <path d="M6 -23 L13 -19 L25 -46 Q26 -51 22 -51Z" fill="#282d37" stroke="#f6f7fb" strokeWidth="1" />
        </g></svg>
        {materials.overlay}
        {confirmation && <MaterialConfirmation key={confirmation.id} x={confirmation.x} y={confirmation.y} />}
      </div>
      </CanvasViewport></div>
      <div className="creation-bottom-overlay">
      {!navigating && materials.contextual}
      <p role="status" className="creation-status">{navigating ? '移动画布：单指平移、双指缩放；素材暂不响应手势' : <>{planning && !materials.pending && <LoaderCircle size={16} className="animate-spin" />}{materials.pending ? '调整好素材后，点击下方按钮确认并继续绘制。' : status}{planning && !materials.pending && <span className="creation-note"> {progress}%</span>}</>}</p>
      <div className="creation-playbar">
        <button className="creation-primary" disabled={!ready || materials.busy || (!playing && !canResume)} onClick={() => {
          if (materials.pending) void materials.confirm();
          else if (playing) pause();
          else resume();
        }}>{materials.busy ? <LoaderCircle size={17} className="animate-spin" /> : <span className="motion-play-icon" data-playing={playing} aria-hidden="true"><Play size={17} className="motion-play" /><Pause size={17} className="motion-pause" /></span>}{materials.busy ? '正在确认…' : materials.pending ? '确认并继续绘制' : playing ? '暂停绘制' : hasPending ? (!allowLayout && !hasStarted ? '开始绘制' : '继续绘制') : drawn ? '本轮绘制完成' : '请先添加素材'}</button>

      </div>
      </div>
      {materials.error && <div role="alert" className="creation-error">{materials.error}</div>}
      {error && <div role="alert" className="creation-error">{error}{ready && !materials.pending && <button onClick={() => plan(priorityRef.current)}>重试续绘</button>}</div>}
    </section>;

  return <StudioWorkspace onReset={onReset} state={workspaceState} stateIcon={
    error || !ready ? undefined : playing && !materials.pending
      ? <Moon size={15} strokeWidth={1.6} aria-hidden="true" />
      : <Sparkle size={15} strokeWidth={1.6} aria-hidden="true" />
  } panels={[
    ...(allowLayout ? [{ id: 'materials', title: '素材库', icon: Shapes, onActivate: () => { materials.setBrushMode('move'); onEvent?.('layout_open'); }, content: <MaterialLibrary disabled={!ready || materials.busy} uploads={uploads} pendingCount={materials.count} controls={materials.pending ? materials.controls : undefined} onUpload={study ? undefined : material => { setUploads(items => [...items, material]); materials.add(material); }} onAdd={addMaterial} /> },
    { id: 'erase', title: '擦除画笔', icon: Eraser, disabled: !materials.selected || materials.busy || navigating, pressed: materials.tool === 'erase' && !navigating, onActivate: () => materials.setBrushMode(materials.tool === 'erase' ? 'move' : 'erase'), content: materials.brushControls },
    { id: 'restore', title: '恢复画笔', icon: Paintbrush, disabled: !materials.selected || materials.busy || navigating, pressed: materials.tool === 'restore' && !navigating, onActivate: () => materials.setBrushMode(materials.tool === 'restore' ? 'move' : 'restore'), content: materials.brushControls }] : []),
    { id: 'tempo', title: '绘画速度', icon: Timer, content: <section className="creation-card"><h2>绘画速度</h2><div className="studio-choices" role="group" aria-label="绘画速度">{([{ value: 140, label: '默认', icon: Gauge }, { value: 65, label: '快速', icon: ChevronsRight }, { value: 20, label: '极速', icon: Zap }, { value: 0, label: '光速', icon: Sparkles }] as const).map(({ value, label, icon: Icon }) => <button key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}><Icon size={20} />{label}</button>)}</div><p className="creation-note">默认适合慢慢观看；光速在计算完成后约 8 秒绘完（暂停时间不计）。已绘制 {drawn} 笔。</p></section> },
    { id: 'expression', title: '表现', icon: Palette, content: <section className="creation-card co-expression"><h2>画面表现</h2>
        <label className="creation-label">色块概括 <output>{expression.abstraction}%</output><input aria-label="色块概括" type="range" min={0} max={100} step={10} value={expression.abstraction} onChange={e => setExpression(p => ({ ...p, abstraction: Number(e.target.value) }))} /></label>
        <div className="co-range-labels"><span>保留细节</span><span>概括色彩</span></div>
        <p className="creation-label">配色气氛</p><div className="studio-choices" role="group" aria-label="配色气氛">{([{ value: 'original', label: '原色', icon: Palette }, { value: 'sunlit', label: '暖阳', icon: Sun }, { value: 'dusk', label: '暮色', icon: Sunset }, { value: 'vivid', label: '浓烈', icon: Flame }, { value: 'morandi', label: '莫兰迪', icon: Flower2 }, { value: 'dopamine', label: '多巴胺', icon: Sparkles }] as const).map(({ value, label, icon: Icon }) => <button key={value} aria-pressed={expression.mood === value} onClick={() => setExpression(p => ({ ...p, mood: value }))}><Icon size={20} />{label}</button>)}</div>
        <button disabled={!ready || materials.pending || materials.busy || !expressionChanged} onClick={applyExpression}>应用并续绘</button>
        <p className="creation-note">用连贯的曲线和统一配色重新表达画面。调整后点击应用，已有画面会逐步变化。</p>
      </section> },
    ...(source ? [{ id: 'reference', title: '参考图', icon: Image, content: <section className="creation-card"><ReferencePreview src={source} /></section> }] : []),
    { id: 'save', title: '保存', icon: Save, content: study ? <StudyArtworkSave save={study.onSave} /> : <ArtworkSave getCanvas={getCanvas} mode="co-create" disabled={!ready || materials.busy} strokeCount={drawn} /> },
  ]}>{main}</StudioWorkspace>;
}

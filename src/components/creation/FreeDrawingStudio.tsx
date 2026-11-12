'use client';

import { useCallback, useEffect, useEffectEvent, useRef, useState, type DragEvent } from 'react';
import { Save, Brush, Palette, Undo2, Image, Shapes, Eraser, Paintbrush } from 'lucide-react';
import PaintCanvas from '@/components/PaintCanvas';
import StudioWorkspace from './StudioWorkspace';
import ArtworkSave from './ArtworkSave';
import type { StrokeDrawData } from '@/lib/stroke-engine';
import { useStudioSession } from './StudioSession';
import CanvasViewport from './CanvasViewport';
import MaterialLibrary from './MaterialLibrary';
import ReferencePreview from '@/components/ReferencePreview';
import { MATERIAL_LIBRARY } from '@/lib/material-library';
import { whiteCanvas, type Material } from '@/lib/co-create';
import useMaterialLayout from './useMaterialLayout';
import StudyArtworkSave from './StudyArtworkSave';
import useStudyStudio, { loadStudyCanvas, type StudyStudioOptions } from './useStudyStudio';

const EMPTY: StrokeDrawData[] = [];
type CanvasAPI = { commitUserToBase: () => void; getBaseCanvas: () => HTMLCanvasElement | null; getUserCanvas: () => HTMLCanvasElement | null; saveUndoSnapshot: () => void; undo: () => void; clearAll: () => void };
function api(): CanvasAPI | undefined { return (window as unknown as { __paintCanvas?: CanvasAPI }).__paintCanvas; }

export default function FreeDrawingStudio({ onReset, study }: { onReset: () => void; study?: StudyStudioOptions }) {
  const session = useStudioSession();
  const { photo, allowLayout, resumeImage, resumeReference, onEvent } = study ?? {};
  const referenceView = useRef<HTMLCanvasElement>(null);
  const reference = useRef<HTMLCanvasElement>(null);
  const loaded = useRef(false);
  const [ready, setReady] = useState(!study);
  const [editing, setEditing] = useState(false);
  const [composedReference, setComposedReference] = useState(resumeReference);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState('');
  const [color, setColor] = useState<[number, number, number]>([.1, .3, .7]);
  const [width, setWidth] = useState(6);
  const [saturation, setSaturation] = useState(1);
  const [value, setValue] = useState(1);
  const [eraser, setEraser] = useState(false);
  const [spray, setSpray] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const commit = useCallback(() => { api()?.commitUserToBase(); session.markChanged(); setDrawn(n => n + 1); onEvent?.('manual_stroke'); }, [session, onEvent]);
  const begin = useCallback(() => { api()?.saveUndoSnapshot(); session.markChanged(); }, [session]);
  const getCanvas = useCallback(() => api()?.getBaseCanvas() ?? null, []);

  function getStudyCanvas() {
    const base = loaded.current && getCanvas();
    if (!base) return null;
    const copy = whiteCanvas(640, 480);
    const ctx = copy.getContext('2d')!;
    ctx.drawImage(base, 0, 0);
    const live = api()?.getUserCanvas();
    if (live) ctx.drawImage(live, 0, 0);
    return copy;
  }

  const materials = useMaterialLayout({
    canvas: referenceView,
    target: reference,
    pause: session.pause,
    onConfirm: (_bounds, labels, placements) => {
      studyStudio.confirmLayout(labels, placements);
      setComposedReference(reference.current?.toDataURL('image/png'));
      setEditing(false);
      setNavigating(false);
    },
    confirmationLabel: '确认参考布局',
  });
  const studyStudio = useStudyStudio(study, materials, getStudyCanvas, () => composedReference ? reference.current : null, session.pause);
  const restoreLayout = useEffectEvent(() => studyStudio.restoreLayout());

  useEffect(() => {
    if (!photo) return;
    let active = true;
    Promise.all([
      resumeImage ? loadStudyCanvas(resumeImage) : undefined,
      allowLayout ? loadStudyCanvas(resumeReference ?? photo) : undefined,
    ]).then(([artwork, target]) => {
      if (!active) return;
      const base = getCanvas();
      if (artwork && base) base.getContext('2d')!.drawImage(artwork, 0, 0);
      reference.current = target ?? null;
      restoreLayout();
      loaded.current = true;
      setReady(true);
      if (resumeImage) onEvent?.('resume_snapshot');
    }).catch(() => { if (active) setError('画面读取失败，请刷新后重试。'); });
    return () => { active = false; loaded.current = false; };
  }, [photo, allowLayout, resumeImage, resumeReference, onEvent, getCanvas]);

  useEffect(() => {
    if (editing && reference.current && referenceView.current) {
      referenceView.current.getContext('2d')!.drawImage(reference.current, 0, 0);
    }
  }, [editing]);

  function showLayout() {
    if (!editing) onEvent?.('layout_open');
    setEditing(true);
  }

  function addMaterial(material: Material, variation: number, position?: { x: number; y: number }) {
    showLayout();
    materials.add(material, position, variation);
    onEvent?.('material_add', material.id);
  }

  function dragOver(event: DragEvent) {
    if (allowLayout && ready && !materials.busy && event.dataTransfer.types.includes('application/x-startrace-material')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function drop(event: DragEvent) {
    if (!allowLayout || !ready || materials.busy) return;
    const material = MATERIAL_LIBRARY.find(item => item.material.id === event.dataTransfer.getData('application/x-startrace-material'));
    const canvas = editing ? referenceView.current : getCanvas();
    if (!material || !canvas) return;
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    addMaterial(material.material, material.variation, {
      x: (event.clientX - bounds.left) * 640 / bounds.width,
      y: (event.clientY - bounds.top) * 480 / bounds.height,
    });
  }

  return <div className="free-studio"><StudioWorkspace onReset={onReset} state={editing ? '编排参考图' : eraser ? '橡皮擦' : spray ? '喷绘' : '自由绘画'} panels={[
    ...(allowLayout ? [
      { id: 'materials', title: '素材库', icon: Shapes, content: <MaterialLibrary disabled={!ready || materials.busy} pendingCount={materials.count} controls={materials.pending ? materials.controls : undefined} onAdd={addMaterial} /> },
      { id: 'erase', title: '擦除素材', icon: Eraser, disabled: !editing || !materials.selected || materials.busy || navigating, pressed: materials.tool === 'erase' && !navigating, onActivate: () => materials.setBrushMode(materials.tool === 'erase' ? 'move' : 'erase'), content: materials.brushControls },
      { id: 'restore', title: '恢复素材', icon: Paintbrush, disabled: !editing || !materials.selected || materials.busy || navigating, pressed: materials.tool === 'restore' && !navigating, onActivate: () => materials.setBrushMode(materials.tool === 'restore' ? 'move' : 'restore'), content: materials.brushControls },
    ] : []),
    { id: 'brush', title: '画笔', icon: Brush, content: <section className="creation-card"><h2>画笔</h2>
      <label className="creation-label studio-range-control"><span>画笔粗细</span><output>{Math.round(width)} px</output><input type="range" aria-label="画笔粗细" min={1} max={60} value={width} onChange={e => setWidth(Number(e.target.value))} /></label>
      <div className="creation-actions"><button aria-pressed={!eraser && !spray} onClick={() => { setEraser(false); setSpray(false); }}>画笔</button><button aria-pressed={spray} onClick={() => { setSpray(true); setEraser(false); }}>喷绘</button><button aria-pressed={eraser} onClick={() => { setEraser(true); setSpray(false); }}>橡皮擦</button></div>
    </section> },
    { id: 'color', title: '颜色', icon: Palette, content: <section className="creation-card"><h2>颜色</h2>
      <label className="creation-label">基础颜色<input type="color" aria-label="画笔颜色" value={'#' + color.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')} onChange={e => { const hex = e.target.value; setColor([parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]); }} /></label>
      <label className="creation-label studio-range-control"><span>饱和度</span><output>{Math.round(saturation * 100)}%</output><input aria-label="画笔饱和度" type="range" min={0} max={1} step={0.01} value={saturation} onChange={e => setSaturation(Number(e.target.value))} /></label>
      <label className="creation-label studio-range-control"><span>明度</span><output>{Math.round(value * 100)}%</output><input aria-label="画笔明度" type="range" min={0} max={1} step={0.01} value={value} onChange={e => setValue(Number(e.target.value))} /></label>
    </section> },
    { id: 'history', title: '编辑', icon: Undo2, content: <section className="creation-card"><h2>编辑画布</h2><div className="creation-actions"><button disabled={!canUndo} onClick={() => { api()?.undo(); session.markChanged(); onEvent?.('manual_undo'); }}>撤销上一笔</button><button onClick={() => { api()?.clearAll(); session.markChanged(); setDrawn(0); }}>清空画布</button></div></section> },
    ...(photo ? [{ id: 'reference', title: '参考图', icon: Image, content: <section className="creation-card">
      <ReferencePreview src={photo} />
      {composedReference && <ReferencePreview src={composedReference} label="已确认的参考布局" />}
      {allowLayout && <button type="button" disabled={!ready || materials.busy} onClick={showLayout}>编排参考图</button>}
    </section> }] : []),
    { id: 'save', title: '保存', icon: Save, content: study ? <StudyArtworkSave save={study.onSave} /> : <ArtworkSave getCanvas={getCanvas} mode="free" strokeCount={drawn} /> },
  ]}>
    <section className="creation-main">
    <div className="creation-canvas-heading"><h1>自由画布</h1><span className="creation-note">按自己的想法落笔</span></div>
    <div className="free-studio-stage" hidden={editing} inert={!ready} onDragOver={dragOver} onDrop={drop}><PaintCanvas width={640} height={480} mode="free" strokes={EMPTY} currentGuideStroke={null} brushWidth={width} freeColor={color} freeSat={saturation} freeVal={value} masterStyle={null} eraserMode={eraser} sprayMode={spray} onUserStrokeDone={commit} onUserStrokeStart={begin} onUndoAvailable={setCanUndo} /></div>
    {error && <p role="alert" className="creation-error">{error}</p>}
    </section>
    {editing && <section className="creation-main co-creation-main study-layout-main" aria-label="编排参考图">
      <div className="studio-canvas-area"><CanvasViewport onDeselect={materials.deselect} onNavigationChange={setNavigating}>
        <div className="co-canvas-wrap" onDragOver={dragOver} onDrop={drop}>
          <canvas ref={referenceView} width={640} height={480} aria-label="参考布局画布" />
          {materials.overlay}
        </div>
      </CanvasViewport></div>
      <div className="creation-bottom-overlay">
        {!navigating && materials.contextual}
        <p className="creation-status">素材布局供手绘时参考。你可以回来继续调整。</p>
        <div className="creation-playbar study-layout-actions">
          <button type="button" className="night-secondary" disabled={materials.busy} onClick={() => { setEditing(false); setNavigating(false); }}>返回手绘</button>
          <button type="button" className="creation-primary" disabled={!materials.pending || materials.busy} onClick={() => void materials.confirm()}>确认参考布局</button>
        </div>
      </div>
      {materials.error && <p role="alert" className="creation-error">{materials.error}</p>}
    </section>}
    </StudioWorkspace>

  </div>;
}

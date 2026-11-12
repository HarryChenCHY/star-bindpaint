'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, X, type LucideIcon } from 'lucide-react';
import { useStudioSession } from './StudioSession';

export type StudioPanel = { id: string; title: string; icon: LucideIcon; content: ReactNode; disabled?: boolean; pressed?: boolean; onActivate?: () => void };
const PanelContext = createContext({ closeForTouch: () => {}, close: () => {} });
export const useStudioPanel = () => useContext(PanelContext);

/** Panels remain mounted so closing a tool never discards its unfinished settings. */
export default function StudioWorkspace({ children, panels, state, onReset, stateIcon }: {
  children: ReactNode;
  panels: StudioPanel[];
  state: string;
  stateIcon?: ReactNode;
  onReset: () => void;
}) {
  const session = useStudioSession();
  const [active, setActive] = useState<string | null>(null);
  const [displayed, setDisplayed] = useState<string | null>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const current = panels.find(panel => panel.id === active);
  const shown = panels.find(panel => panel.id === displayed);
  useEffect(() => session.registerSavePanel(() => { setDisplayed('save'); setActive('save'); }), [session]);
  useEffect(() => {
    if (!active) return;
    function dismiss(event: PointerEvent) {
      const element = event.target as HTMLElement;
      if (!element.closest('.studio-panel, .studio-tool-buttons')) setActive(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { buttons.current.get(active!)?.focus(); setActive(null); }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [active]);
  function close() {
    if (active) buttons.current.get(active)?.focus();
    setActive(null);
  }

  return <PanelContext.Provider value={{ closeForTouch: () => {}, close }}><div className="studio-workspace" data-panel-open={Boolean(current)} data-panel={displayed ?? ''}>
    <nav className="studio-tools" aria-label="画布工具">
      <span className="studio-state">{stateIcon ?? <span aria-hidden="true" />}{state}</span>
      {['side', 'top'].map(group => <div key={group} className={`studio-tool-buttons studio-tool-${group}-group`}>{panels.filter(panel => (['save', 'reference', 'expression'].includes(panel.id) ? 'top' : 'side') === group).map(({ id, title, icon: Icon, disabled, pressed, onActivate }) => <button
        key={id} ref={node => { if (node) buttons.current.set(id, node); else buttons.current.delete(id); }}
        disabled={disabled} aria-pressed={pressed} type="button" className={id === 'save' || id === 'reference' || id === 'expression' ? 'studio-tool-top' : 'studio-tool-side'} title={title} aria-label={title} aria-expanded={active === id} aria-controls={`studio-panel-${id}`}
        onClick={() => { onActivate?.(); setDisplayed(id); if (pressed !== undefined) setActive(pressed ? null : id); else setActive(previous => previous === id ? null : id); }}>
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span className="sr-only">{title}</span>
      </button>)}{group === 'side' && <button type="button" className="studio-tool-side" title="重制" aria-label="重制" ref={resetButton} onClick={() => { session.pause(); resetDialog.current?.showModal(); }}>
        <RotateCcw size={20} strokeWidth={1.7} aria-hidden="true" /><span className="sr-only">重制</span>
      </button>}</div>)}
    </nav>
    <dialog ref={resetDialog} className="studio-exit-dialog motion-dialog" aria-labelledby="studio-reset-title" onClose={() => resetButton.current?.focus()}>
      <h2 id="studio-reset-title">重新开始绘制？</h2><p>将清除本次新增素材和绘制内容，回到最初的照片或空白画布。此操作无法撤销。</p><div className="studio-exit-actions"><button autoFocus onClick={() => resetDialog.current?.close()}>留在画布</button><button className="night-danger" onClick={() => { resetDialog.current?.close(); onReset(); }}>清除并重制</button></div>
    </dialog>
    {children}
    <aside className="studio-panel" data-size={displayed === 'materials' ? 'wide' : displayed === 'erase' || displayed === 'restore' ? 'brush' : 'compact'} data-placement={['save', 'reference', 'expression'].includes(displayed ?? '') ? 'top' : 'side'} hidden={!current} inert={!current} aria-hidden={!current} aria-label={shown?.title} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
    }}>
      <div className="studio-panel-heading"><h2 title={shown?.title}>{shown?.title}</h2><button type="button" aria-label="收起工具面板" onClick={close}><X size={18} /></button></div>
      <div className="studio-panel-scroll">{panels.map(panel => <div key={panel.id} id={`studio-panel-${panel.id}`} hidden={displayed !== panel.id}>{panel.content}</div>)}</div>
    </aside>
  </div></PanelContext.Provider>;
}

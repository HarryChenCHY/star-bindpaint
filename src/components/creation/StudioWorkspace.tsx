'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, X, type LucideIcon } from 'lucide-react';

export type StudioPanel = { id: string; title: string; icon: LucideIcon; content: ReactNode };

/** Panels remain mounted so closing a tool never discards its unfinished settings. */
export default function StudioWorkspace({ children, panels, state, onReset, stateIcon }: {
  children: ReactNode;
  panels: StudioPanel[];
  state: string;
  stateIcon?: ReactNode;
  onReset: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [displayed, setDisplayed] = useState<string | null>(null);
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const current = panels.find(panel => panel.id === active);
  const shown = panels.find(panel => panel.id === displayed);
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

  return <div className="studio-workspace" data-panel-open={Boolean(current)} data-panel={displayed ?? ''}>
    <nav className="studio-tools" aria-label="画布工具">
      <span className="studio-state">{stateIcon ?? <span aria-hidden="true" />}{state}</span>
      {['side', 'top'].map(group => <div key={group} className={`studio-tool-buttons studio-tool-${group}-group`}>{panels.filter(panel => (['save', 'reference', 'expression'].includes(panel.id) ? 'top' : 'side') === group).map(({ id, title, icon: Icon }) => <button
        key={id} ref={node => { if (node) buttons.current.set(id, node); else buttons.current.delete(id); }}
        type="button" className={id === 'save' || id === 'reference' || id === 'expression' ? 'studio-tool-top' : 'studio-tool-side'} title={title} aria-label={title} aria-expanded={active === id} aria-controls={`studio-panel-${id}`}
        onClick={() => { setDisplayed(id); setActive(previous => previous === id ? null : id); }}>
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span className="sr-only">{title}</span>
      </button>)}{group === 'side' && <button type="button" className="studio-tool-side" title="重制" aria-label="重制" onClick={onReset}>
        <RotateCcw size={20} strokeWidth={1.7} aria-hidden="true" /><span className="sr-only">重制</span>
      </button>}</div>)}
    </nav>
    {children}
    <aside className="studio-panel" hidden={!current} inert={!current} aria-hidden={!current} aria-label={shown?.title} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
    }}>
      <div className="studio-panel-heading"><h2>{shown?.title}</h2><button type="button" aria-label="收起工具面板" onClick={close}><X size={18} /></button></div>
      <div className="studio-panel-scroll">{panels.map(panel => <div key={panel.id} id={`studio-panel-${panel.id}`} hidden={displayed !== panel.id}>{panel.content}</div>)}</div>
    </aside>
  </div>;
}

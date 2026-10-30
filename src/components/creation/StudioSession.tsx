'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { guardStudioHistory } from '@/lib/studio-history';

type Session = {
  pause: () => void;
  markChanged: () => void;
  markSaved: () => void;
  setPending: (pending: boolean) => void;
  registerPause: (pause: () => void) => () => void;
  registerSavePanel: (open: () => void) => () => void;
};
const noop = () => {};
const SessionContext = createContext<Session>({ pause: noop, markChanged: noop, markSaved: noop, setPending: noop, registerPause: () => noop, registerSavePanel: () => noop });
export const useStudioSession = () => useContext(SessionContext);

export default function StudioSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const state = useRef({ dirty: false, pending: false, pause: noop, openSave: noop });
  const dialog = useRef<HTMLDialogElement>(null);
  const requested = useRef<(() => void) | null>(null);
  const focusBefore = useRef<HTMLElement | null>(null);
  const session = useMemo<Session>(() => ({
    pause: () => state.current.pause(),
    markChanged: () => { state.current.dirty = true; },
    markSaved: () => { state.current.dirty = false; },
    setPending: pending => { state.current.pending = pending; },
    registerPause: pause => { state.current.pause = pause; return () => { if (state.current.pause === pause) state.current.pause = noop; }; },
    registerSavePanel: open => { state.current.openSave = open; return () => { if (state.current.openSave === open) state.current.openSave = noop; }; },
  }), []);
  useEffect(() => {
    const dirty = () => state.current.dirty || state.current.pending;
    function request(action: () => void) {
      if (!dirty()) { action(); return; }
      if (requested.current) return;
      state.current.pause();
      requested.current = action;
      focusBefore.current = document.activeElement as HTMLElement | null;
      dialog.current?.showModal();
    }
    const history = guardStudioHistory(window, request);
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, window.location.href);
      if (!['http:', 'https:'].includes(url.protocol) || (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      request(() => history.leave(() => {
        if (url.origin === window.location.origin) router.push(url.pathname + url.search + url.hash);
        else window.location.assign(url.href);
      }));
    }
    function unload(event: BeforeUnloadEvent) {
      if (!history.isLeaving() && dirty()) { event.preventDefault(); event.returnValue = ''; }
    }
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', unload);
    return () => { history.dispose(); document.removeEventListener('click', click, true); window.removeEventListener('beforeunload', unload); requested.current = null; };
  }, [router]);
  function stay() {
    requested.current = null; dialog.current?.close();
    focusBefore.current?.focus();
  }
  function discard() {
    const leave = requested.current; requested.current = null;
    dialog.current?.close(); leave?.();
  }
  return <SessionContext.Provider value={session}>{children}
    <dialog ref={dialog} className="studio-exit-dialog motion-dialog" aria-labelledby="studio-exit-title" aria-describedby="studio-exit-description" onCancel={event => { event.preventDefault(); stay(); }}>
      <ArrowLeft size={24} aria-hidden="true" />
      <h2 id="studio-exit-title">离开当前画布？</h2>
      <p id="studio-exit-description">当前有未保存的绘画或素材布局。离开后，这些内容将丢失。</p>
      <p className="creation-note">保存只保留已经画出的内容，待确认素材需要先确认并绘制。</p>
      <div className="studio-exit-actions">
        <button className="night-primary" onClick={() => { stay(); state.current.openSave(); }}><Save size={16} />先去保存</button>
        <button className="night-secondary" autoFocus onClick={stay}>留在画布</button>
        <button className="night-danger" onClick={discard}>不保存并离开</button>
      </div>
    </dialog>
  </SessionContext.Provider>;
}

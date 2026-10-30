const MARKER = '__startraceStudioGuard';
type NavigationHost = Pick<Window, 'history' | 'location' | 'addEventListener' | 'removeEventListener'>;

/** 同URL哨兵先接住返回；放行前退回原条目，不累积额外历史记录。 */
export function guardStudioHistory(host: NavigationHost, request: (leave: () => void) => void) {
  let pending: (() => void) | null = null;
  let leaving = false;
  const href = host.location.href;
  const sentinel = () => Boolean(host.history.state?.[MARKER]);
  const push = () => host.history.pushState({ ...host.history.state, [MARKER]: true }, '', href);
  if (!sentinel()) push();
  const leave = (action: () => void) => {
    if (leaving || pending) return;
    if (sentinel()) { pending = action; host.history.back(); }
    else { leaving = true; action(); }
  };
  const pop = (event: Event) => {
    if (leaving) return;
    event.stopImmediatePropagation();
    if (pending) {
      const action = pending; pending = null; leaving = true; action();
      return;
    }
    push();
    request(() => leave(() => host.history.back()));
  };
  host.addEventListener('popstate', pop, true);
  return { leave, isLeaving: () => leaving || Boolean(pending), dispose: () => host.removeEventListener('popstate', pop, true) };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardStudioHistory } from '../../src/lib/studio-history';

function browser() {
  const events = new EventTarget();
  const entries = [{ href: '/create', state: {} }, { href: '/paint', state: { __NA: true, tree: ['paint'] } }];
  let index = 1;
  const host = {
    location: { get href() { return entries[index].href; } },
    history: {
      get state() { return entries[index].state; },
      pushState(state: object, _title: string, href: string) { entries.splice(index + 1); entries.push({ state, href }); index++; },
      back() { if (index > 0) { index--; queueMicrotask(() => events.dispatchEvent(new Event('popstate'))); } },
    },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
  };
  return { host: host as unknown as Window, entries, index: () => index };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('cancelled repeated browser back stays in the studio with one sentinel and preserves Next state', async () => {
  const b = browser(); let requests = 0;
  const guard = guardStudioHistory(b.host, () => requests++);
  assert.equal(b.host.history.state.__NA, true);
  for (let n = 0; n < 3; n++) { b.host.history.back(); await tick(); assert.equal(b.index(), 2); assert.equal(b.entries.length, 3); }
  assert.equal(requests, 3); assert.equal(guard.isLeaving(), false); guard.dispose();
});

test('confirmed back reaches the previous page once and strips the sentinel', async () => {
  const b = browser(); let confirm: (() => void) | undefined;
  const guard = guardStudioHistory(b.host, action => { confirm = action; });
  b.host.history.back(); await tick();
  assert.equal(b.index(), 2); confirm!(); await tick();
  assert.equal(b.index(), 0); assert.equal(b.host.location.href, '/create'); assert.equal(guard.isLeaving(), true); guard.dispose();
});

test('link navigation removes the sentinel before pushing its destination', async () => {
  const b = browser(); const guard = guardStudioHistory(b.host, action => action());
  guard.leave(() => b.host.history.pushState({}, '', '/gallery')); await tick();
  assert.deepEqual(b.entries.map(entry => entry.href), ['/create', '/paint', '/gallery']);
  assert.equal(b.index(), 2); guard.dispose();
});

test('Strict Mode effect replay does not append another history entry', () => {
  const b = browser(); const first = guardStudioHistory(b.host, () => {}); first.dispose();
  const second = guardStudioHistory(b.host, () => {});
  assert.equal(b.entries.length, 3); second.dispose();
});

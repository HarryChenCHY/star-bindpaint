import assert from 'node:assert/strict';
import test from 'node:test';
import { createSceneExitGate } from '../../src/lib/scene-exit-gate';

test('slow navigation retains the scene until the destination is ready', () => {
  let exits = 0;
  const gate = createSceneExitGate(() => exits++);
  gate.requestExit();
  gate.requestExit(); // repeated skip while loading
  assert.equal(exits, 0);
  gate.setReady(true);
  assert.equal(exits, 1);
  gate.setReady(true);
  gate.requestExit();
  assert.equal(exits, 1);
});

test('fast navigation never cuts short the visual story', () => {
  let exits = 0;
  const gate = createSceneExitGate(() => exits++);
  gate.setReady(true);
  assert.equal(exits, 0);
  gate.requestExit();
  assert.equal(exits, 1);
});

test('skip on an already prepared route starts exactly one exit', () => {
  let exits = 0;
  const gate = createSceneExitGate(() => exits++);
  gate.setReady(true);
  gate.requestExit();
  gate.requestExit(); // animation completion races with skip
  assert.equal(exits, 1);
});

test('unmount prevents late route completion from starting a stale animation', () => {
  let exits = 0;
  const gate = createSceneExitGate(() => exits++);
  gate.requestExit();
  gate.dispose();
  gate.setReady(true);
  gate.requestExit();
  assert.equal(exits, 0);
});

test('a route that becomes unready cannot be revealed', () => {
  let exits = 0;
  const gate = createSceneExitGate(() => exits++);
  gate.setReady(true);
  gate.setReady(false);
  gate.requestExit();
  assert.equal(exits, 0);
  gate.setReady(true);
  assert.equal(exits, 1);
});

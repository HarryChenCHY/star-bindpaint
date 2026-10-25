import assert from 'node:assert/strict';
import test from 'node:test';
import { startAnimationLoop } from '../../src/lib/animation-loop';

function frames() {
  let id = 0;
  const pending = new Map<number, FrameRequestCallback>();
  return {
    pending,
    request(callback: FrameRequestCallback) { pending.set(++id, callback); return id; },
    cancel(frame: number) { pending.delete(frame); },
    take() {
      const entry = pending.entries().next().value;
      assert.ok(entry, 'Expected a scheduled frame');
      pending.delete(entry[0]);
      return entry[1];
    },
  };
}

test('Cleanup blocks even an already-dispatched frame from drawing or rescheduling', () => {
  const scheduler = frames();
  let draws = 0;
  const stop = startAnimationLoop(() => { draws++; }, scheduler);
  scheduler.take()(10);
  assert.equal(draws, 1);
  const lateFrame = scheduler.take();
  stop();
  lateFrame(20);
  assert.equal(draws, 1);
  assert.equal(scheduler.pending.size, 0);
});

test('A detached or unavailable surface ends the loop without leaving pending frames', () => {
  const scheduler = frames();
  startAnimationLoop(() => false, scheduler);
  scheduler.take()(10);
  assert.equal(scheduler.pending.size, 0);
});

test('Stopping during a draw does not queue a new frame', () => {
  const scheduler = frames();
  const stop = startAnimationLoop(() => stop(), scheduler);
  scheduler.take()(10);
  assert.equal(scheduler.pending.size, 0);
});

test('Effect restart cancels the old loop while the new speed loop continues', () => {
  const scheduler = frames();
  let oldDraws = 0, newDraws = 0;
  const stopOld = startAnimationLoop(() => { oldDraws++; }, scheduler);
  stopOld();
  stopOld();
  const stopNew = startAnimationLoop(() => { newDraws++; }, scheduler);
  scheduler.take()(10);
  scheduler.take()(20);
  assert.equal(oldDraws, 0);
  assert.equal(newDraws, 2);
  assert.equal(scheduler.pending.size, 1);
  stopNew();
  assert.equal(scheduler.pending.size, 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaintingTracker } from '../../src/lib/painting-tracker';

test('撤销恢复手绘/跳过/补笔计数，保留真实尝试且重画不重复计数', () => {
  const tracker = new PaintingTracker();
  tracker.startSession(1000);
  tracker.strokeStart();
  const restore = tracker.captureArtworkProgress();
  tracker.strokeCompleted(0, 'red', { x: 1, y: 1 }, 1);
  tracker.strokesBatched(1, 10);
  tracker.strokeSkipped(11, { x: 2, y: 2 });
  tracker.finishSession('old-image');
  restore();
  const restored = tracker.getSession();
  assert.equal(restored.completedStrokes, 0);
  assert.equal(restored.batchedStrokes, 0);
  assert.equal(restored.skippedStrokes, 0);
  assert.equal(restored.strokes.length, 0);
  assert.equal(restored.manualAttemptCount, 1);
  assert.equal(restored.endTime, 0);
  assert.equal(restored.finalImageBase64, '');
  tracker.strokeStart();
  tracker.strokeCompleted(0, 'red', { x: 1, y: 1 }, 1);
  assert.equal(tracker.getSession().completedStrokes, 1);
  assert.equal(tracker.getSession().manualAttemptCount, 2);
});
